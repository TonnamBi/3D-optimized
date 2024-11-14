from flask import Flask, render_template, request, jsonify
from flask_cors import CORS  

app = Flask(__name__)
CORS(app)  

BASE_BOX_DIM = 30

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate_packing', methods=['POST'])
def calculate_packing():
    data = request.json
    boxes = data.get('boxes')

    boxes = sorted(boxes, key=lambda box: box['length'] * box['width'] * box['height'], reverse=True)

    packed_boxes = []
    occupied_spaces = []
    placement_status = [] 

    for box_index, box in enumerate(boxes):
        placed = False
        for z in range(0, BASE_BOX_DIM, 1):  
            if placed:
                break
            for y in range(0, BASE_BOX_DIM, 1):  
                if placed:
                    break
                for x in range(0, BASE_BOX_DIM, 1): 
                    if (x + box['length'] <= BASE_BOX_DIM and
                        y + box['width'] <= BASE_BOX_DIM and
                        z + box['height'] <= BASE_BOX_DIM):
                        
                        overlap = False
                        for occupied in occupied_spaces:
                            if not (x + box['length'] <= occupied[0] or x >= occupied[0] + occupied[3] or
                                    y + box['width'] <= occupied[1] or y >= occupied[1] + occupied[4] or
                                    z + box['height'] <= occupied[2] or z >= occupied[2] + occupied[5]):
                                overlap = True
                                break
                        
                        if not overlap:
                            packed_boxes.append({
                                'id': len(packed_boxes),
                                'x': x,
                                'y': y,
                                'z': z,
                                'length': box['length'],
                                'width': box['width'],
                                'height': box['height']
                            })

                            occupied_spaces.append([x, y, z, box['length'], box['width'], box['height']])
                            placed = True
                            break

        if placed:
            placement_status.append({'box_index': box_index, 'status': 'Placed'})
        else:
            placement_status.append({'box_index': box_index, 'status': 'Not Placed'})

    return jsonify({
        'packed_boxes': packed_boxes,
        'placement_status': placement_status
    })



if __name__ == '__main__':
    app.run(debug=True)
