#!/bin/sh
# Bake one prefab. Usage: sh .claude/tools/bake/bake.sh <spec.js> [Name]   (Name default = spec basename)
# Output: assets/prefabs/<Name>.prefab. Needs Cocos editor open on this project. See README.md.
exec python -I "$(dirname "$0")/bake.py" "$@"
