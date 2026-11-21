"""TV10 - Nguyen Tien Tai: run the integrated experiments and exports.

Usage: python firefly_tv10.py [--output-dir PATH]
All FA runs use core.engine.FireflySolver; see simulations/tv10.py.
"""
from pathlib import Path
import argparse
from export_tv10 import export_tv10_results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path,
                        default=Path(__file__).resolve().parent / 'results' / 'tv10')
    args = parser.parse_args()
    return export_tv10_results(args.output_dir)


if __name__ == '__main__':
    main()
