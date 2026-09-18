"""Compatibility entry: rebuild the differentiated Sun Wen architecture layer."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sunwen_architecture import main

if __name__ == '__main__':
    main()
