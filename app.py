from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

BASE_BOX_DIM = 30

def check_overlap(x, y, z, box, occupied_spaces):
    for occupied in occupied_spaces:
        if not (x + box['length'] <= occupied[0] or x >= occupied[0] + occupied[3] or
                y + box['width'] <= occupied[1] or y >= occupied[1] + occupied[4] or
                z + box['height'] <= occupied[2] or z >= occupied[2] + occupied[5]):
            return True
    return False

def get_rotations(box):
    length, width, height = box['length'], box['width'], box['height']
    return [
        {'length': length, 'width': width, 'height': height},  
        {'length': length, 'width': height, 'height': width},  
        {'length': width, 'width': length, 'height': height},  
        {'length': width, 'width': height, 'height': length}, 
        {'length': height, 'width': length, 'height': width},  
        {'length': height, 'width': width, 'height': length},  
    ]

def calculate_unused_space(x, y, z, box):
    occupied_volume = box['length'] * box['width'] * box['height']
    total_volume = BASE_BOX_DIM * BASE_BOX_DIM * BASE_BOX_DIM
    return total_volume - occupied_volume

def can_place_box(x, y, z, box, occupied_spaces):
    if (x + box['length'] > BASE_BOX_DIM or
        y + box['width'] > BASE_BOX_DIM or
        z + box['height'] > BASE_BOX_DIM):
        return False

    for occupied in occupied_spaces:
        if not (x + box['length'] <= occupied[0] or x >= occupied[0] + occupied[3] or
                y + box['width'] <= occupied[1] or y >= occupied[1] + occupied[4] or
                z + box['height'] <= occupied[2] or z >= occupied[2] + occupied[5]):
            return False 

    return True  

def find_lowest_position(rotated_box, occupied_spaces):
    for x in range(BASE_BOX_DIM):
        for z in range(BASE_BOX_DIM):
            if can_place_box(x, 0, z, rotated_box, occupied_spaces):  
                return x, 0, z  

    for y in range(1, BASE_BOX_DIM): 
        for x in range(BASE_BOX_DIM):
            for z in range(BASE_BOX_DIM):
                if can_place_box(x, y, z, rotated_box, occupied_spaces):  
                    return x, y, z  

    return None  

def find_best_rotation_position(box, occupied_spaces):
    best_position = None
    best_rotation = None
    best_unused_space = BASE_BOX_DIM * BASE_BOX_DIM * BASE_BOX_DIM  

    for rotated_box in get_rotations(box):
        position = find_lowest_position(rotated_box, occupied_spaces)
        if position:
            x, y, z = position
            unused_space = calculate_unused_space(x, y, z, rotated_box)
            if unused_space < best_unused_space:
                best_position = position
                best_rotation = rotated_box
                best_unused_space = unused_space

    return best_position, best_rotation

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate_packing', methods=['POST'])
def calculate_packing():
    data = request.json
    boxes = data.get('boxes')
    
    packed_boxes = []  
    occupied_spaces = []
    placement_status = [] 

    for box_index, box in enumerate(boxes):
        placed = False  

        position, rotated_box = find_best_rotation_position(box, occupied_spaces)
        if position:
            x, y, z = position
            box_color = random.randint(0, 0xFFFFFF)

            packed_boxes.append({
                'id': box_index,
                'x': x,
                'y': y,
                'z': z,
                'length': rotated_box['length'],
                'width': rotated_box['width'],
                'height': rotated_box['height'],
                'color': box_color 
            })

            occupied_spaces.append([x, y, z, rotated_box['length'], rotated_box['width'], rotated_box['height']])
            placed = True

        placement_status.append({
            'box': f"Box {box_index + 1}",
            'status': 'Placed' if placed else 'Cannot Place',
            'color': packed_boxes[-1]['color'] if placed else None  
        })

    return jsonify({
        'packed_boxes': packed_boxes,
        'placement_status': placement_status
    })

if __name__ == '__main__':
    app.run(debug=True)
