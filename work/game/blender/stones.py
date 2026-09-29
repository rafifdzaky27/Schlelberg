"""Chiselled stone blocks for the chamber, built in Blender (headless) and exported as one GLB.

Each block is a cube with random chips cut from its corners and edges (boolean cuts with rotated
cubes), a slight tilt on each face, a small bevel, and flat shading, so it reads as hand-cut stone.
Meshes: wall_0..wall_5, slab_0..slab_3. Run: python stones.py <out.glb>
"""
import sys, random, math
import bpy, bmesh
from mathutils import Vector, Euler

out = sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def cube(name, size=1.0):
    bpy.ops.mesh.primitive_cube_add(size=size)
    o = bpy.context.active_object; o.name = name
    return o

def chiselled(name, seed, chips, depth, top_flat=False):
    rnd = random.Random(seed)
    o = cube(name)
    # tilt each face a little so no two sides are parallel
    bm = bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        v.co += Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.025
    bm.to_mesh(o.data); bm.free()
    # slice corners and edges off with flat planes, like chisel breaks, and cap each cut
    bm = bmesh.new(); bm.from_mesh(o.data)
    for k in range(chips):
        corner = Vector((rnd.choice([-1, 1]), rnd.choice([-1, 1]), rnd.choice([-1, 1])))
        if top_flat and corner.z > 0: corner.z = -1
        if rnd.random() < 0.45:
            corner[rnd.randrange(3)] = 0  # an edge instead of a corner
        n = (corner + Vector((rnd.uniform(-.35, .35), rnd.uniform(-.35, .35), rnd.uniform(-.35, .35)))).normalized()
        reach = max(abs(v.co.dot(n)) for v in bm.verts)
        point = n * (reach - rnd.uniform(depth * 0.4, depth))
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=point, plane_no=n, clear_outer=True)
        cut_edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if cut_edges:
            bmesh.ops.holes_fill(bm, edges=cut_edges, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(o.data); bm.free()
    bev = o.modifiers.new('bev', 'BEVEL'); bev.width = 0.015; bev.segments = 1; bev.limit_method = 'ANGLE'
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='bev')
    # box-projected UVs for the painted texture, then flat shading for crisp facets
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=1.0); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.shade_flat()
    return o

made = []
for i in range(6): made.append(chiselled(f'wall_{i}', seed=100 + i, chips=8, depth=0.2))
for i in range(4): made.append(chiselled(f'slab_{i}', seed=200 + i, chips=6, depth=0.14, top_flat=True))
for i, o in enumerate(made): o.location = (i * 1.5, 0, 0)
bpy.ops.object.select_all(action='DESELECT')
for o in made: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_materials='NONE', export_yup=True)
print('exported', out, [(o.name, len(o.data.polygons)) for o in made])
