// app.js
import config from './config.js';

// Inisialisasi Firebase Firestore
const app = firebase.initializeApp(config.firebase);
const db = firebase.firestore();
console.log('Firebase initialized successfully');

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Fungsi untuk memuat proyek publik (akses bebas)
        async function loadPublicProjects() {
            try {
                const projectsContainer = document.getElementById('projectsContainer')?.querySelector('.row');
                if (!projectsContainer) {
                    console.log('Projects container not found');
                    return;
                }

                projectsContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';
                const snapshot = await db.collection('projects').get();
                projectsContainer.innerHTML = '';
                if (snapshot.empty) {
                    projectsContainer.innerHTML = '<p class="text-center">No projects found</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const project = doc.data();
                    const div = document.createElement('div');
                    div.className = 'col-md-4 mb-4';
                    div.innerHTML = `
                        <div class="card h-100">
                            ${project.imageUrl ? `<img src="${project.imageUrl}" class="card-img-top" alt="${project.name}" style="max-height: 200px; object-fit: cover;">` : ''}
                            <div class="card-body">
                                <h5 class="card-title">${project.name}</h5>
                                <p class="card-text"><strong>Type:</strong> ${project.type}</p>
                                <p class="card-text"><strong>Status:</strong> ${project.status}</p>
                                <p class="card-text"><strong>Added By:</strong> ${project.addedBy}</p>
                                <button class="btn btn-secondary tutorial-btn" data-id="${doc.id}">View Tutorial</button>
                            </div>
                        </div>
                    `;
                    projectsContainer.appendChild(div);
                });

                document.querySelectorAll('.tutorial-btn').forEach(button => {
                    button.addEventListener('click', () => showTutorial(button.dataset.id));
                });
            } catch (error) {
                console.error('Error loading public projects:', error);
                if (projectsContainer) {
                    projectsContainer.innerHTML = '<p class="text-center">Failed to load projects. Please try again later.</p>';
                }
            }
        }

        // Fungsi untuk menampilkan tutorial
        async function showTutorial(projectId) {
            try {
                const tutorialContainer = document.getElementById('tutorialContainer');
                const projectsContainer = document.getElementById('projectsContainer');
                if (tutorialContainer) tutorialContainer.style.display = 'block';
                if (projectsContainer) projectsContainer.style.display = 'none';

                const projectDoc = await db.collection('projects').doc(projectId).get();
                if (!projectDoc.exists) {
                    if (tutorialContainer) {
                        tutorialContainer.innerHTML = '<p class="text-center">Project not found</p>';
                    }
                    return;
                }

                const project = projectDoc.data();
                const tutorialProjectName = document.getElementById('tutorialProjectName');
                const tutorialProjectLink = document.getElementById('tutorialProjectLink');
                const tutorialDescription = document.getElementById('tutorialDescription');
                if (tutorialProjectName) tutorialProjectName.textContent = project.name;
                if (tutorialProjectLink) {
                    tutorialProjectLink.href = project.link;
                    tutorialProjectLink.textContent = project.link;
                }
                if (tutorialDescription) tutorialDescription.textContent = project.description;
            } catch (error) {
                console.error('Error showing tutorial:', error);
                const tutorialContainer = document.getElementById('tutorialContainer');
                if (tutorialContainer) {
                    tutorialContainer.innerHTML = '<p class="text-center">Failed to load tutorial. Please try again later.</p>';
                }
            }
        }

        // Fungsi untuk login admin
        async function adminLogin() {
            try {
                const username = document.getElementById('adminUsername')?.value.trim();
                const password = document.getElementById('adminPassword')?.value.trim();
                const adminMessage = document.getElementById('adminMessage');
                if (adminMessage) adminMessage.textContent = '';

                if (!username || !password) {
                    if (adminMessage) adminMessage.textContent = 'Please fill all fields';
                    return;
                }

                const adminSnapshot = await db.collection('admins').where('username', '==', username).where('password', '==', password).get();
                if (adminSnapshot.empty) {
                    if (adminMessage) adminMessage.textContent = 'Invalid username or password';
                    console.log('Admin login failed: Invalid credentials');
                    return;
                }

                const adminData = adminSnapshot.docs[0].data();
                localStorage.setItem('admin', JSON.stringify({ username: adminData.username }));
                console.log('Admin login successful:', adminData.username);

                const adminLoginContainer = document.getElementById('adminLoginContainer');
                const addProjectForm = document.getElementById('addProjectForm');
                if (adminLoginContainer) adminLoginContainer.style.display = 'none';
                if (addProjectForm) addProjectForm.style.display = 'block';
            } catch (error) {
                console.error('Error logging in admin:', error);
                const adminMessage = document.getElementById('adminMessage');
                if (adminMessage) adminMessage.textContent = 'Error: ' + error.message;
            }
        }

        // Fungsi untuk logout admin
        function adminLogout() {
            localStorage.removeItem('admin');
            const adminLoginContainer = document.getElementById('adminLoginContainer');
            const addProjectForm = document.getElementById('addProjectForm');
            if (adminLoginContainer) adminLoginContainer.style.display = 'block';
            if (addProjectForm) addProjectForm.style.display = 'none';
            console.log('Admin logout successful');
        }

        // Fungsi untuk upload proyek
        async function addProject() {
            try {
                const admin = JSON.parse(localStorage.getItem('admin'));
                if (!admin) {
                    alert('Please login as admin first');
                    return;
                }

                const name = document.getElementById('projectName')?.value.trim();
                const type = document.getElementById('projectType')?.value;
                const status = document.getElementById('projectStatus')?.value;
                const link = document.getElementById('projectLink')?.value.trim();
                const description = document.getElementById('projectDescription')?.value.trim();
                const imageInput = document.getElementById('projectImage');
                const addProjectMessage = document.getElementById('addProjectMessage');
                if (addProjectMessage) addProjectMessage.textContent = '';

                if (!name || !type || !status || !link || !description) {
                    if (addProjectMessage) addProjectMessage.textContent = 'Please fill all fields';
                    return;
                }

                let imageUrl = '';
                if (imageInput?.files?.length > 0) {
                    const formData = new FormData();
                    formData.append('file', imageInput.files[0]);
                    formData.append('upload_preset', config.cloudinary.uploadPreset);

                    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.secure_url) {
                        imageUrl = data.secure_url;
                    } else {
                        if (addProjectMessage) addProjectMessage.textContent = 'Failed to upload image';
                        return;
                    }
                }

                const projectData = {
                    name,
                    type,
                    status,
                    link,
                    description,
                    imageUrl,
                    addedBy: admin.username,
                    createdAt: { timestamp: new Date().toISOString() }
                };

                await db.collection('projects').add(projectData);
                alert('Project added successfully');
                document.getElementById('addProjectForm')?.reset();
            } catch (error) {
                console.error('Error adding project:', error);
                const addProjectMessage = document.getElementById('addProjectMessage');
                if (addProjectMessage) addProjectMessage.textContent = 'Error: ' + error.message;
            }
        }

        // Event listener untuk tombol
        const adminLoginButton = document.getElementById('adminLoginButton');
        if (adminLoginButton) adminLoginButton.addEventListener('click', adminLogin);

        const adminLogoutButton = document.getElementById('adminLogoutButton');
        if (adminLogoutButton) adminLogoutButton.addEventListener('click', adminLogout);

        const submitProjectButton = document.getElementById('submitProjectButton');
        if (submitProjectButton) submitProjectButton.addEventListener('click', addProject);

        // Cek apakah admin sudah login saat halaman dimuat
        const admin = JSON.parse(localStorage.getItem('admin'));
        if (admin) {
            const adminLoginContainer = document.getElementById('adminLoginContainer');
            const addProjectForm = document.getElementById('addProjectForm');
            if (adminLoginContainer) adminLoginContainer.style.display = 'none';
            if (addProjectForm) addProjectForm.style.display = 'block';
        }

        // Muat proyek publik di halaman utama
        loadPublicProjects();
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
        alert('Failed to initialize application: ' + error.message);
    }
});