from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from py3dbp import Packer, Bin, Item

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate_packing', methods=['POST'])
def calculate_packing():
    try:
        data = request.json
        print("Received data:", data)

        WHD = data.get('base_dimensions')
        boxes = data.get('boxes')

        if not WHD or not isinstance(WHD, list) or len(WHD) != 3 or any(dim <= 0 for dim in WHD):
            return jsonify({"error": "Invalid or missing base dimensions"}), 400

        if not boxes or not isinstance(boxes, list):
            return jsonify({"error": "Invalid or missing boxes data"}), 400

        packed_boxes = []

        packer = Packer()
        base_box = Bin(
            partno='BaseBox',
            WHD=tuple(WHD),
            max_weight=10000,
            corner=0,
            put_type=0
        )
        packer.addBin(base_box)

        boxes = sorted(boxes, key=lambda b: b.get('fragile', False))

        for i, i_box in enumerate(boxes):
            if all(key in i_box for key in ['width', 'height', 'length', 'weight', 'fragile']):
                weight = i_box['weight'] if i_box['weight'] > 0 else 10
                packer.addItem(Item(
                    partno=str(i + 1),
                    name=i_box.get('name', f"Box {i + 1}"),
                    typeof='cube',
                    WHD=(i_box['width'], i_box['height'], i_box['length']),
                    weight=weight,
                    level=1,
                    loadbear=10 if not i_box.get('fragile', False) else 1,
                    updown=True,
                    color='#FF0000'
                ))
            else:
                return jsonify({"error": f"Invalid box data at index {i}"}), 400

        packer.pack(
            bigger_first=True,
            distribute_items=False,
            fix_point=True,
            check_stable=True,
            support_surface_ratio=0.75,
            number_of_decimals=0
        )

        MAX_WEIGHT_FRAGILE = 5000

        for box in packer.bins:
            for item in box.items:
                x, y, z = item.position
                w, h, d = item.getDimension()

                if x + w > WHD[0] or y + h > WHD[1] or z + d > WHD[2]:
                    return jsonify({"error": f"Item {item.partno} does not fit inside the base box."}), 400

                if item.loadbear == 1:
                    weight_above = sum(
                        i.weight for i in box.items
                        if i.position[1] > item.position[1] and
                        i.position[0] < item.position[0] + item.getDimension()[0] and
                        i.position[2] < item.position[2] + item.getDimension()[2]
                    )
                    if weight_above > MAX_WEIGHT_FRAGILE:
                        return jsonify({"error": f"Too much weight on fragile item {item.partno}"}), 400

                packed_boxes.append({
                    'id': item.partno,
                    'name': item.name,
                    'x': int(x),
                    'y': int(y),
                    'z': int(z),
                    'width': int(w),
                    'height': int(h),
                    'length': int(d),
                    'weight': item.weight,
                    'fragile': item.loadbear == 1
                })

        return jsonify({
            'packed_boxes': packed_boxes
        })

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
