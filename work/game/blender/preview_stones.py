import sys, bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-2])
objs = [o for o in bpy.data.objects if o.type == 'MESH']
for i, o in enumerate(objs):
    o.location = ((i % 6) * 1.5 - 3.75, (i // 6) * 1.6, 0)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
cam.location = (0, -7.5, 5.5); cam.rotation_euler = (math.radians(58), 0, 0)
bpy.context.scene.camera = cam
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.rotation_euler = (math.radians(50), 0, math.radians(30)); bpy.context.collection.objects.link(sun)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24
mat = bpy.data.materials.new('stone'); mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.62, 0.52, 0.4, 1)
for o in objs: o.data.materials.append(mat)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
sc.render.resolution_x, sc.render.resolution_y = 1200, 600
sc.render.filepath = sys.argv[-1]
bpy.ops.render.render(write_still=True)
