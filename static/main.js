import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container3D").appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(40, 40, 40);
camera.lookAt(0, 0, 0);

const BASE_BOX_DIM = 30;

const ambientLight = new THREE.AmbientLight(0x404040, 2); 
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1); 
directionalLight.position.set(50, 50, 50);
scene.add(directionalLight);

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
            <h3>Box ${boxCount + 1}</h3>
            <label for="length${boxCount}">Length:</label>
            <input type="number" id="length${boxCount}" required />
            <label for="width${boxCount}">Width:</label>
            <input type="number" id="width${boxCount}" required />
            <label for="height${boxCount}">Height:</label>
            <input type="number" id="height${boxCount}" required />
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

    const boxInputs = boxesContainer.getElementsByClassName("boxInput");
    for (let i = 0; i < boxInputs.length; i++) {
        const length = document.getElementById(`length${i}`);
        const width = document.getElementById(`width${i}`);
        const height = document.getElementById(`height${i}`);

        if (length && width && height) {
            boxes.push({
                length: parseFloat(length.value),
                width: parseFloat(width.value),
                height: parseFloat(height.value),
            });
        }
    }

    if (boxes.length === 0) {
        alert("Please enter at least one box.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/calculate_packing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boxes }),
        });

        if (!response.ok) {
            throw new Error("Failed to calculate packing");
        }

        const packedBoxes = await response.json();
        console.log("Packed boxes data:", packedBoxes);
        visualizePacking(packedBoxes);
        updateBoxStatus(packedBoxes.placement_status);
    } catch (error) {
        console.error("Error:", error);
        alert("There was an error while calculating the packing. Please try again.");
    }
}

function visualizePacking(responseData) {
    const packedBoxes = responseData.packed_boxes;
    console.log("Visualizing Packing Data:", packedBoxes);

    scene.children = scene.children.filter((child) => child.type === "AmbientLight" || child.type === "DirectionalLight" || child.type === "PerspectiveCamera");

    const baseBox = new THREE.BoxGeometry(BASE_BOX_DIM, BASE_BOX_DIM, BASE_BOX_DIM);
    const baseMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const baseMesh = new THREE.Mesh(baseBox, baseMaterial);
    scene.add(baseMesh);

    console.log("Base box added to scene.");

    packedBoxes.forEach((box, i) => {
        console.log(`Adding box ${i}:`, box);

        const geometry = new THREE.BoxGeometry(box.length, box.width, box.height);
        const color = box.color; 
        const material = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
            box.x - BASE_BOX_DIM / 2 + box.length / 2,
            box.y - BASE_BOX_DIM / 2 + box.width / 2,
            box.z - BASE_BOX_DIM / 2 + box.height / 2
        );
        scene.add(mesh);
    });

    console.log("Packed boxes added to scene.");
}

function updateBoxStatus(placementStatus) {
    const statusList = document.getElementById("box-status-list");
    statusList.innerHTML = ""; 

    placementStatus.forEach((statusObj) => {
        const listItem = document.createElement("li");

        listItem.style.display = "flex";
        listItem.style.alignItems = "center"; 
        listItem.style.marginBottom = "10px"; 

        const colorHex = `#${statusObj.color.toString(16).padStart(6, '0')}`;

        const colorIndicator = document.createElement("div");
        colorIndicator.style.width = "15px";
        colorIndicator.style.height = "15px";
        colorIndicator.style.borderRadius = "50%";
        colorIndicator.style.backgroundColor = colorHex;
        colorIndicator.style.marginRight = "10px"; 

        listItem.appendChild(colorIndicator);
        listItem.appendChild(document.createTextNode(`${statusObj.box}: ${statusObj.status}`));

        statusList.appendChild(listItem);
    });
}

document.getElementById("calculateBtn").addEventListener("click", calculatePacking);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
