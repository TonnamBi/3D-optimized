import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container3D").appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.z = 80;

const DIVISIONS = 5;
const labelMeshes = [];
const rulerGroup = new THREE.Group();
const boxesGroup = new THREE.Group();
const light = new THREE.AmbientLight(0x404040);
scene.add(light);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let boxCount = 1;

document.getElementById("addBoxBtn").addEventListener("click", () => {
    if (boxCount < 20) {
        const newBoxInput = document.createElement("div");
        newBoxInput.classList.add("boxInput");
        newBoxInput.innerHTML = ` 
            <h3>Box ${boxCount + 1}: <input type="text" id="boxName${boxCount}" placeholder="Box Name" required /></h3>
            <label for="length${boxCount}">Height:</label>
            <input type="number" id="length${boxCount}" required />
            <label for="width${boxCount}">Width:</label>
            <input type="number" id="width${boxCount}" required />
            <label for="height${boxCount}">Length:</label>
            <input type="number" id="height${boxCount}" required />
            <label for="weight${boxCount}">Weight(Kg):</label>
            <input type="number" id="weight${boxCount}" required />
            <label for="fragile${boxCount}">Fragile:</label>
            <select id="fragile${boxCount}" required>
                <option value="false">Not Fragile</option>
                <option value="true">Fragile</option>
            </select>
        `;
        document.getElementById("boxes").appendChild(newBoxInput);
        boxCount++;
    } else {
        alert("You can only add up to 20 boxes.");
    }
});

async function calculatePacking() {
    const boxes = [];
    const boxesContainer = document.getElementById("boxes");

    const baseLength = parseFloat(document.getElementById("baseLength").value);
    const baseWidth = parseFloat(document.getElementById("baseWidth").value);
    const baseHeight = parseFloat(document.getElementById("baseHeight").value);

    if (!baseLength || !baseWidth || !baseHeight) {
        alert("Please enter valid dimensions for the base box.");
        return;
    }

    scrollToBottom();

    const boxInputs = boxesContainer.getElementsByClassName("boxInput");
    for (let i = 0; i < boxInputs.length; i++) {
        const name = document.getElementById(`boxName${i}`).value;
        const length = document.getElementById(`length${i}`);
        const width = document.getElementById(`width${i}`);
        const height = document.getElementById(`height${i}`);
        const weight = document.getElementById(`weight${i}`);
        const fragileDropdown = document.getElementById(`fragile${i}`);

        if (!name || !length.value || !width.value || !height.value || !weight.value || !fragileDropdown) {
            alert(`Box ${i + 1} has invalid or missing data.`);
            return;
        }

        const fragile = fragileDropdown.value === "true";

        boxes.push({
            name: name,
            length: parseFloat(length.value),
            width: parseFloat(width.value),
            height: parseFloat(height.value),
            weight: parseFloat(weight.value),
            fragile: fragile
        });
    }

    if (boxes.length === 0) {
        alert("Please enter at least one box.");
        return;
    }

    const requestBody = {
        base_dimensions: [baseWidth, baseHeight, baseLength],
        boxes
    };
    console.log("Request Body:", requestBody);

    try {
        const response = await fetch("http://127.0.0.1:5000/calculate_packing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.error || "Failed to calculate packing");
        }

        const packedBoxes = await response.json();
        console.log("Packed boxes data:", packedBoxes);
        visualizePacking(packedBoxes, baseWidth, baseHeight, baseLength);
    } catch (error) {
        console.error("Error:", error);
        alert(error.message || "There was an error while calculating the packing. Please try again.");
    }
}

function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
}

function visualizePacking(responseData, baseWidth, baseHeight, baseLength) {
    const packedBoxes = responseData.packed_boxes;

    rulerGroup.clear();
    boxesGroup.clear();

    const baseBox = new THREE.BoxGeometry(baseWidth, baseLength, baseHeight);
    const edgesGeometry = new THREE.EdgesGeometry(baseBox);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const baseEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    baseEdges.position.set(0, 0, 0);

    rulerGroup.add(baseEdges);
    createDynamicRulerLines([baseWidth, baseLength, baseHeight]);

    packedBoxes.forEach((box) => {
        const geometry = new THREE.BoxGeometry(box.width, box.length, box.height);
        const color = Math.floor(Math.random() * 0xffffff);
        const material = new THREE.MeshBasicMaterial({ color: color });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            box.x - baseWidth / 2 + box.width / 2,
            box.z - baseLength / 2 + box.length / 2,
            box.y - baseHeight / 2 + box.height / 2
        );

        mesh.userData = {
            name: box.name,
            width: box.width,
            length: box.length,
            height: box.height,
            weight: box.weight,
            fragile: box.fragile
        };

        boxesGroup.add(mesh);
    });

    scene.add(boxesGroup);
}

function addLabel(value, axis, position, sizeTuple) {
    const fontLoader = new THREE.FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        const textGeometry = new THREE.TextGeometry(value.toString(), {
            font: font,
            size: 0.75,
            height: 0.1,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        if (axis === 0) {
            textMesh.position.set(position, -sizeTuple[1] / 2 - 2, -sizeTuple[2] / 2);
        } else if (axis === 1) {
            textMesh.position.set(-sizeTuple[0] / 2 - 2, position, -sizeTuple[2] / 2);
        } else if (axis === 2) {
            textMesh.position.set(-sizeTuple[0] / 2, -sizeTuple[1] / 2 - 2, position);
        }
        rulerGroup.add(textMesh);
        labelMeshes.push(textMesh);
    });
}

function updateLabels() {
    labelMeshes.forEach((label) => {
        label.lookAt(camera.position);
    });
}

function createDynamicRulerLines(sizeTuple) {
    for (let axis = 0; axis < 3; axis++) {
        for (let i = 0; i <= DIVISIONS; i++) {
            const interval = sizeTuple[axis] / DIVISIONS;
            const position = i * interval - sizeTuple[axis] / 2;
            const axisVector = [new THREE.Vector3(), new THREE.Vector3()];

            if (axis === 0) {
                axisVector[0].set(position, -sizeTuple[1] / 2, -sizeTuple[2] / 2);
                axisVector[1].set(position, -sizeTuple[1] / 2 - 1, -sizeTuple[2] / 2);
            } else if (axis === 1) {
                axisVector[0].set(-sizeTuple[0] / 2, position, -sizeTuple[2] / 2);
                axisVector[1].set(-sizeTuple[0] / 2 - 1, position, -sizeTuple[2] / 2);
            } else if (axis === 2) {
                axisVector[0].set(-sizeTuple[0] / 2, -sizeTuple[1] / 2, position);
                axisVector[1].set(-sizeTuple[0] / 2, -sizeTuple[1] / 2 - 1, position);
            }

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
            const geometry = new THREE.BufferGeometry().setFromPoints(axisVector);
            const line = new THREE.Line(geometry, lineMaterial);
            rulerGroup.add(line);

            addLabel(i * interval, axis, position, sizeTuple);
        }
    }

    scene.add(rulerGroup);
}

renderer.setAnimationLoop(() => {
    updateLabels();
    renderer.render(scene, camera);
});

const raycaster = new THREE.Raycaster();
const tooltip = document.getElementById("tooltip");

document.addEventListener("mousemove", (event) => {
    const coords = new THREE.Vector2(
        (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        -((event.clientY / renderer.domElement.clientHeight) * 2 - 1),
    );

    raycaster.setFromCamera(coords, camera);

    const intersections = raycaster.intersectObjects(boxesGroup.children, true);

    boxesGroup.children.forEach(obj => {
        obj.material.opacity = 0.5;
        obj.material.transparent = true;
    });

    if (intersections.length > 0) {
        const selectedObject = intersections[0].object;
        const properties = selectedObject.userData;

        selectedObject.material.opacity = 1.0;

        tooltip.innerHTML = `
            <strong>Name: </strong>${properties.name || 'N/A'}<br>
            <strong>Size: </strong>${properties.width} x ${properties.length} x ${properties.height}<br>
            <strong>Weight: </strong>${properties.weight} Kg<br>
            <strong>Fragile: </strong>${properties.fragile ? "Yes" : "No"}
        `;
        tooltip.style.left = `${event.clientX + 30}px`;
        tooltip.style.top = `${event.clientY + 550}px`;
        tooltip.style.display = "block";
    } else {
        tooltip.style.display = "none";
    }
});

document.getElementById("calculateBtn").addEventListener("click", calculatePacking);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();