"""Probe Slipstream factory for pools and common router addresses."""
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://rpc.test.mezo.org"))
factory_addr = Web3.to_checksum_address("0x7B61BC8Aa460476d142F1CD107A47297002f69ff")

# Minimal Uniswap V3 factory ABI
factory_abi = [
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
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
]

factory = w3.eth.contract(address=factory_addr, abi=factory_abi)

# Your deployed mock tokens from last deploy
token_a = Web3.to_checksum_address("0x942fecbd46f6C21246737C5cb2CAcFDcFa8cbF7c")
token_b = Web3.to_checksum_address("0x794488A14E63C678380630e338fc556df578508E")

for fee in [500, 3000, 10000]:
    try:
        pool = factory.functions.getPool(token_a, token_b, fee).call()
        print(f"getPool(MCKA,MCKB,fee={fee}): {pool}")
    except Exception as e:
        print(f"getPool fee={fee} failed: {e}")

# Common Velodrome/Slipstream router candidates on testnets (may need update)
candidates = [
    "0x0000000000000000000000000000000000000002",  # placeholder in deploy.ts
]
print("\n(Add SWAP_ROUTER from Mezo/Velodrome docs when you have it)")
