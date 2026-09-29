#!/bin/bash
cd "$(dirname "$0")"
T=993dd6b7-0d01-4524-aaf9-72d3c1eb034d
R=$(python3 tripo_client.py task "{\"type\":\"animate_rig\",\"original_model_task_id\":\"$T\",\"out_format\":\"glb\",\"rig_type\":\"biped\",\"spec\":\"tripo\"}" tobious rig)
python3 tripo_client.py wait $R tobious rig 2>&1 | tail -1
for A in walk idle; do
  ID=$(python3 tripo_client.py task "{\"type\":\"animate_retarget\",\"original_model_task_id\":\"$R\",\"out_format\":\"glb\",\"animation\":\"preset:$A\",\"bake_animation\":true}" tobious anim-$A)
  python3 tripo_client.py wait $ID tobious anim-$A 2>&1 | tail -1
done
python3 tripo_client.py balance
