"""Find a Mezo testnet CL pool via Slipstream factory."""
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://rpc.test.mezo.org"))
factory = Web3.to_checksum_address("0x7B61BC8Aa460476d142F1CD107A47297002f69ff")

# Slipstream often uses tickSpacing as pool key (not fee tier)
factory_abi = [
    {
        "inputs": [
            {"name": "tokenA", "type": "address"},
            {"name": "tokenB", "type": "address"},
            {"name": "tickSpacing", "type": "int24"},
        ],
        "name": "getPool",
        "outputs": [{"name": "pool", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "tokenA", "type": "address"},
            {"name": "tokenB", "type": "address"},
            {"name": "fee", "type": "uint24"},
        ],
        "name": "getPool",
        "outputs": [{"name": "pool", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
]

# Known testnet tokens (Mezo docs)
tokens = {
    "MUSD": "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
    "mUSDC": "0xe1a26db653708A2AD8F824E92Db9852410e33A59",
    "mUSDT": "0x629320719a6190bd145C277226fd45e7648F950A",
}

pairs = [
    ("MUSD", "mUSDC"),
    ("MUSD", "mUSDT"),
]

contract = w3.eth.contract(address=factory, abi=factory_abi)

for a_name, b_name in pairs:
    a = Web3.to_checksum_address(tokens[a_name])
    b = Web3.to_checksum_address(tokens[b_name])
    print(f"\nPair {a_name}/{b_name}")
    for tick_spacing in [1, 10, 50, 100, 200, 2000]:
        try:
            pool = contract.functions.getPool(a, b, tick_spacing).call()
            if int(pool, 16) != 0:
                print(f"  tickSpacing={tick_spacing} -> {pool}")
        except Exception:
            pass
    for fee in [100, 500, 3000, 10000]:
        try:
            pool = contract.functions.getPool(a, b, fee).call()
            if int(pool, 16) != 0:
                print(f"  fee={fee} -> {pool}")
        except Exception:
            pass
