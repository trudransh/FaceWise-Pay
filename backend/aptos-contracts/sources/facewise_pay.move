module facewise_pay::facewise_pay {
    use aptos_framework::fungible_asset::{Self, Metadata, MintRef, BurnRef, FungibleAsset};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::error;
    use std::signer;
    use std::string;
    use std::option;

    // Errors
    const E_NOT_ADMIN: u64 = 1;
    const E_INVALID_AMOUNT: u64 = 2;
    const E_REPLAY_ATTACK: u64 = 3;
    const E_POLICY_EXISTS: u64 = 4;

    // Core structs
    struct AdminCap has key {}
    
    struct RewardConfig has key {
        reward_rate: u64,  // e.g., 1 FWSR per 1 USDC
    }
    
    struct BiometricPolicy has key {
        user: address,
        cid: vector<u8>,  // IPFS CID as bytes
        nonce: u64,   // For replay protection
        max_age: u64, // Absolute timestamp for expiry
    }

    // Token-specific structs (embedded here)
    struct TokenRefs has key {
        mint_ref: MintRef,
        burn_ref: BurnRef,
        metadata: Object<Metadata>,
    }

    // Events
    #[event]
    struct PaymentEvent has drop, store {
        from: address,
        to: address,
        amount: u64,
        asset: Object<Metadata>,
    }

    #[event]
    struct RewardMinted has drop, store {
        to: address,
        amount: u64,
    }

    #[event]
    struct PolicyUpdated has drop, store {
        user: address,
        nonce: u64,
    }

    // Init: Sets up admin, config, and FWSR token
    fun init_module(admin: &signer) {
        // Admin cap
        move_to(admin, AdminCap {});
        
        // Reward config
        move_to(admin, RewardConfig { reward_rate: 1 });
        
        // Create FWSR token
        let constructor_ref = object::create_named_object(admin, b"FWSR");
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &constructor_ref,
            option::none<u128>(),
            string::utf8(b"FaceWise Reward Token"),
            string::utf8(b"FWSR"),
            8,  // Decimals
            string::utf8(b"https://facewisepay.io/icon.png"),
            string::utf8(b"https://facewisepay.io"),
        );
        
        let mint_ref = fungible_asset::generate_mint_ref(&constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(&constructor_ref);
        let metadata_obj = object::object_from_constructor_ref<Metadata>(&constructor_ref);
        
        move_to(admin, TokenRefs { mint_ref, burn_ref, metadata: metadata_obj });
    }

    // Mint FWSR (admin-only)
    public fun mint(admin: &signer, amount: u64): FungibleAsset acquires TokenRefs {
        assert!(exists<AdminCap>(signer::address_of(admin)), error::permission_denied(E_NOT_ADMIN));
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));

        let token_refs = borrow_global<TokenRefs>(signer::address_of(admin));  // Use admin address for storage
        fungible_asset::mint(&token_refs.mint_ref, amount)
    }

    // Get FWSR metadata (public view)
    public fun FWSR_metadata(admin_addr: address): Object<Metadata> acquires TokenRefs {
        borrow_global<TokenRefs>(admin_addr).metadata
    }

    // Core payment flow: Transfer USDC + mint rewards (requires admin for minting)
    public entry fun transfer_usdc_with_rewards(
        from: &signer, 
        admin: &signer,  // For secure minting (use multisig in prod)
        to: address, 
        amount: u64, 
        usdc_metadata: Object<Metadata>
    ) acquires RewardConfig, TokenRefs {
        assert!(exists<AdminCap>(signer::address_of(admin)), error::permission_denied(E_NOT_ADMIN));
        assert!(amount > 0, error::invalid_argument(E_INVALID_AMOUNT));

        let from_addr = signer::address_of(from);
        let admin_addr = signer::address_of(admin);
        
        // Transfer USDC
        primary_fungible_store::transfer(from, usdc_metadata, to, amount);
        event::emit(PaymentEvent { from: from_addr, to, amount, asset: usdc_metadata });
        
        // Auto-mint FWSR rewards
        let config = borrow_global<RewardConfig>(admin_addr);
        let reward_amount = amount * config.reward_rate;
        let reward_fa = mint(admin, reward_amount);
        primary_fungible_store::deposit(to, reward_fa);
        event::emit(RewardMinted { to, amount: reward_amount });
    }

    // Create or update biometric policy (with replay protection)
    public entry fun create_or_update_biometric_policy(
        user: &signer, 
        cid: vector<u8>, 
        nonce: u64, 
        max_age: u64  // Set to timestamp::now_seconds() + expiry_duration
    ) acquires BiometricPolicy {
        let user_addr = signer::address_of(user);
        if (exists<BiometricPolicy>(user_addr)) {
            let policy = borrow_global_mut<BiometricPolicy>(user_addr);
            assert!(nonce > policy.nonce, error::invalid_state(E_REPLAY_ATTACK));
            policy.cid = cid;
            policy.nonce = nonce;
            policy.max_age = max_age;
        } else {
            move_to(user, BiometricPolicy { user: user_addr, cid, nonce, max_age });
        };
        event::emit(PolicyUpdated { user: user_addr, nonce });
    }

    // Verify policy (public view function)
    public fun verify_policy(user_addr: address, provided_nonce: u64): bool acquires BiometricPolicy {
        if (!exists<BiometricPolicy>(user_addr)) { return false };
        let policy = borrow_global<BiometricPolicy>(user_addr);
        (provided_nonce == policy.nonce) && (timestamp::now_seconds() <= policy.max_age)
    }

    // Optional: Update reward rate (admin-only)
    public entry fun update_reward_rate(admin: &signer, new_rate: u64) acquires RewardConfig {
        assert!(exists<AdminCap>(signer::address_of(admin)), error::permission_denied(E_NOT_ADMIN));
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<RewardConfig>(admin_addr);
        config.reward_rate = new_rate;
    }

    // Test functions (for local testing)
    
    #[test(admin = @0x1)]
    fun test_init_and_mint(admin: &signer) acquires TokenRefs {
        init_module(admin);
        let fa = mint(admin, 1000);
        assert!(fungible_asset::amount(&fa) == 1000, 100);  // Use amount(fa)
    }

    #[test(user = @0x2, admin = @0x1)]
    fun test_transfer_and_policy(user: &signer, admin: &signer) acquires BiometricPolicy {
        init_module(admin);
        create_or_update_biometric_policy(user, b"QmTestCID", 1, timestamp::now_seconds() + 3600);
        assert!(verify_policy(signer::address_of(user), 1), 101);
    }
}