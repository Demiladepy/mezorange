"""Simulate Slipstream CLFactory.createPool on Mezo testnet (no tx sent)."""
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://rpc.test.mezo.org"))
factory = Web3.to_checksum_address("0x7B61BC8Aa460476d142F1CD107A47297002f69ff")

MUSD = Web3.to_checksum_address("0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503")
BTC = Web3.to_checksum_address("0x7670000000000000000000000000000000000000")

# Sort token0 < token1 like Uniswap/Slipstream
token0, token1 = (MUSD, BTC) if int(MUSD, 16) < int(BTC, 16) else (BTC, MUSD)
print(f"token0: {token0}")
print(f"token1: {token1}")
print(f"tickSpacing: 200")
print(f"sqrtPriceX96: {2**96}\n")

# Signature A: createPool(tokenA, tokenB, tickSpacing, sqrtPriceX96)
abi_a = [
    {
        "inputs": [
            {"name": "tokenA", "type": "address"},
            {"name": "tokenB", "type": "address"},
            {"name": "tickSpacing", "type": "int24"},
            {"name": "sqrtPriceX96", "type": "uint160"},
        ],
        "name": "createPool",
        "outputs": [{"name": "pool", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

print("=== Try A: createPool(tokenA, tokenB, tickSpacing, sqrtPriceX96) ===")
try:
    c = w3.eth.contract(address=factory, abi=abi_a)
    pool = c.functions.createPool(token0, token1, 200, 2**96).call()
    print(f"OK — simulated pool address: {pool}")
except Exception as e:
    print(f"Reverted/failed: {e}\n")

# Signature B: createPool(tokenA, tokenB, tickSpacing) only
abi_b = [
    {
        "inputs": [
            {"name": "tokenA", "type": "address"},
            {"name": "tokenB", "type": "address"},
            {"name": "tickSpacing", "type": "int24"},
        ],
        "name": "createPool",
        "outputs": [{"name": "pool", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

print("=== Try B: createPool(tokenA, tokenB, tickSpacing) ===")
try:
    c = w3.eth.contract(address=factory, abi=abi_b)
    pool = c.functions.createPool(token0, token1, 200).call()
    print(f"OK — simulated pool address: {pool}")
except Exception as e:
    print(f"Reverted/failed: {e}\n")

# Check if pool already exists
abi_get = [
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
    }
]

print("=== Existing pool via getPool ===")
try:
    c = w3.eth.contract(address=factory, abi=abi_get)
    existing = c.functions.getPool(token0, token1, 200).call()
    print(f"getPool(MUSD/BTC, 200): {existing}")
    if int(existing, 16) != 0:
        print("Pool already exists — createPool would likely revert with 'exists' error")
except Exception as e:
    print(f"getPool failed: {e}")
