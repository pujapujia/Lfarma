// Nonaktifkan Metamask untuk hindari error inpage.js
window.ethereum = null;

// Firebase Config (GANTI DENGAN CONFIG DARI FIREBASE CONSOLE)
const firebaseConfig = {
    apiKey: "AIzaSyCTYu51tAUlNS_11gcIA6yzNS1ziUzmglU",
    authDomain: "lfarm-e11ad.firebaseapp.com",
    projectId: "lfarm-e11ad",
    storageBucket: "lfarm-e11ad.firebasestorage.app",
    messagingSenderId: "240256024936",
    appId: "1:240256024936:web:b50a13187c05102c0e56dd",
    measurementId: "G-SYCJT5KJW9"
  };

// Inisialisasi Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
    alert('Failed to initialize Firebase. Please check API Key and try again.');
}
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Cek koneksi Firestore
db.collection('users').get().then(snapshot => {
    console.log('Firestore connected, collections size:', snapshot.size);
}).catch(error => {
    console.error('Firestore connection error:', error);
    alert('Failed to connect to Firestore: ' + error.message);
});

// Fungsi untuk cek keberadaan halaman
async function checkPageExists(url) {
    try {
        console.log('Checking page existence:', url);
        const response = await fetch(url, { method: 'HEAD' });
        console.log('Page check result:', url, response.ok);
        return response.ok;
    } catch (error) {
        console.error('Error checking page:', url, error);
        return false;
    }
}

// Fungsi Login
window.login = async function login() {
    try {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const loginMessage = document.getElementById('loginMessage');
        loginMessage.textContent = '';

        if (!email || !password) {
            loginMessage.textContent = 'Please enter email and password';
            return;
        }

        console.log('Login attempt:', { email });
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('Firebase Auth user:', user.uid);

        // Ambil data user dari Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            console.log('User data not found, creating new document for:', user.uid);
            const userData = {
                username: email.split('@')[0],
                email: email,
                isAdmin: email === 'leviathan@lfarm.com',
                allowedTools: email === 'leviathan@lfarm.com',
                createdAt: { timestamp: new Date().toISOString() }
            };
            await db.collection('users').doc(user.uid).set(userData);
            localStorage.setItem('user', JSON.stringify({ id: user.uid, ...userData }));
        } else {
            const userData = { id: user.uid, ...userDoc.data() };
            localStorage.setItem('user', JSON.stringify(userData));
        }

        const userData = JSON.parse(localStorage.getItem('user'));
        console.log('User data loaded:', userData);
        document.getElementById('navbarUsername').textContent = userData.username;
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('logoutButton').style.display = 'block';
        document.getElementById('navbarUsername').style.display = 'inline-block';
        document.getElementById('messagesButton').style.display = 'inline-block';
        document.getElementById('actionsContainer').style.display = 'block';
        if (userData.isAdmin) {
            document.getElementById('pendingUsersButton').style.display = 'inline-block';
        }

        // Cek keberadaan halaman sebelum redirect
        const targetPage = userData.isAdmin ? '/admin.html' : '/user.html';
        const pageExists = await checkPageExists(window.location.origin + targetPage);
        if (pageExists) {
            console.log('Redirecting to:', targetPage);
            window.location.href = targetPage;
        } else {
            console.warn(`Page ${targetPage} not found, staying on home`);
            alert(`Page ${targetPage} not found. Staying on home.`);
        }
    } catch (error) {
        console.error('Error logging in:', error);
        let message = 'Login failed: ';
        switch (error.code) {
            case 'auth/invalid-email':
                message += 'Invalid email format';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                message += 'Incorrect email or password';
                break;
            case 'auth/too-many-requests':
                message += 'Too many attempts, try again later';
                break;
            case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
                message += 'Invalid API Key. Please contact administrator.';
                break;
            default:
                message += error.message;
        }
        document.getElementById('loginMessage').textContent = message;
    }
};

// Fungsi Logout
window.logout = async function logout() {
    try {
        await auth.signOut();
        localStorage.removeItem('user');
        document.getElementById('logoutButton').style.display = 'none';
        document.getElementById('navbarUsername').style.display = 'none';
        document.getElementById('messagesButton').style.display = 'none';
        document.getElementById('pendingUsersButton').style.display = 'none';
        document.getElementById('actionsContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'block';
        window.location.href = '/';
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out: ' + error.message);
    }
};

// Fungsi Register
window.register = async function register() {
    try {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();
        const registerMessage = document.getElementById('registerMessage');
        registerMessage.textContent = '';

        console.log('Register attempt:', { username, email });

        if (!username || !email || !password) {
            registerMessage.textContent = 'Please fill all fields';
            return;
        }

        if (username.length < 3) {
            registerMessage.textContent = 'Username must be at least 3 characters';
            return;
        }

        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            registerMessage.textContent = 'Please enter a valid email';
            return;
        }

        if (password.length < 6) {
            registerMessage.textContent = 'Password must be at least 6 characters';
            return;
        }

        // Cek apakah email sudah ada di pendingUsers
        const pendingSnapshot = await db.collection('pendingUsers').where('email', '==', email).get();
        if (!pendingSnapshot.empty) {
            registerMessage.textContent = 'Email is already pending approval';
            return;
        }

        // Cek apakah email sudah ada di users
        const userSnapshot = await db.collection('users').where('email', '==', email).get();
        if (!userSnapshot.empty) {
            registerMessage.textContent = 'Email is already registered';
            return;
        }

        await db.collection('pendingUsers').add({
            username,
            email,
            password,
            isAdmin: false,
            allowedTools: false,
            createdAt: { timestamp: new Date().toISOString() }
        });
        console.log('Registration submitted for:', email);
        alert('Registration submitted, awaiting admin approval');
        showLogin();
    } catch (error) {
        console.error('Error registering:', error);
        document.getElementById('registerMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Reset Password
window.resetPassword = async function resetPassword() {
    try {
        const email = document.getElementById('resetEmail').value.trim();
        const resetMessage = document.getElementById('resetMessage');
        resetMessage.textContent = '';

        if (!email) {
            resetMessage.textContent = 'Please enter your email';
            return;
        }

        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            resetMessage.textContent = 'Please enter a valid email';
            return;
        }

        console.log('Reset password attempt:', { email });
        await auth.sendPasswordResetEmail(email);
        alert('Password reset email sent. Check your inbox.');
        showLogin();
    } catch (error) {
        console.error('Error resetting password:', error);
        let message = 'Error: ';
        switch (error.code) {
            case 'auth/invalid-email':
                message += 'Invalid email format';
                break;
            case 'auth/user-not-found':
                message += 'Email not found';
                break;
            case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
                message += 'Invalid API Key. Please contact administrator.';
                break;
            default:
                message += error.message;
        }
        document.getElementById('resetMessage').textContent = message;
    }
};

// Fungsi Show/Hide Form
window.showRegisterForm = function showRegisterForm() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('registerContainer').style.display = 'block';
    document.getElementById('resetPasswordContainer').style.display = 'none';
    document.getElementById('loginMessage').textContent = '';
};

window.showForgotPassword = function showForgotPassword() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('registerContainer').style.display = 'none';
    document.getElementById('resetPasswordContainer').style.display = 'block';
    document.getElementById('loginMessage').textContent = '';
};

window.showLogin = function showLogin() {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('registerContainer').style.display = 'none';
    document.getElementById('resetPasswordContainer').style.display = 'none';
    document.getElementById('registerMessage').textContent = '';
    document.getElementById('resetMessage').textContent = '';
};

// Fungsi Add Project
window.addProject = async function addProject() {
    try {
        const projectName = document.getElementById('projectName').value.trim();
        const projectType = document.getElementById('projectType').value;
        const projectLink = document.getElementById('projectLink').value.trim();
        const projectDescription = document.getElementById('projectDescription').value.trim();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const projectImage = document.getElementById('projectImage').files[0];
        const addProjectMessage = document.getElementById('addProjectMessage');
        addProjectMessage.textContent = '';

        console.log('Add project attempt:', { projectName, projectType, projectLink, startDate, endDate, image: !!projectImage });

        const user = auth.currentUser;
        if (!user) {
            addProjectMessage.textContent = 'Please login first';
            showLogin();
            return;
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            addProjectMessage.textContent = 'User data not found';
            await auth.signOut();
            return;
        }

        const userData = userDoc.data();
        console.log('User data:', userData);

        if (!userData.allowedTools && projectType === 'Tools') {
            alert('You do not have permission to add Tools projects. Please request access from admin.');
            showMessageForm();
            return;
        }

        if (!projectName || !projectType || !projectLink || !projectDescription || !startDate || !endDate) {
            addProjectMessage.textContent = 'Please fill all fields';
            return;
        }

        if (!projectLink.match(/^https?:\/\/.+/)) {
            addProjectMessage.textContent = 'Please enter a valid URL';
            return;
        }

        let imageUrl = '';
        if (projectImage) {
            console.log('Uploading image:', projectImage.name, projectImage.size);
            if (projectImage.size > 5 * 1024 * 1024) {
                addProjectMessage.textContent = 'Image size must be less than 5MB';
                return;
            }
            const storageRef = storage.ref(`project_images/${user.uid}/${Date.now()}_${projectImage.name}`);
            const snapshot = await storageRef.put(projectImage);
            imageUrl = await snapshot.ref.getDownloadURL();
            console.log('Image uploaded:', imageUrl);
        }

        const projectData = {
            name: projectName,
            type: projectType,
            link: projectLink,
            description: projectDescription,
            startDate,
            endDate,
            status: 'Berjalan',
            addedBy: userData.username,
            imageUrl: imageUrl || '',
            createdAt: { timestamp: new Date().toISOString() }
        };

        console.log('Saving project:', projectData);
        await db.collection('projects').add(projectData);
        alert('Project added successfully');
        showProjects();
    } catch (error) {
        console.error('Error adding project:', error);
        document.getElementById('addProjectMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Show Projects
window.showProjects = function showProjects() {
    document.getElementById('actionsContainer').style.display = 'block';
    document.getElementById('addProjectForm').style.display = 'none';
    document.getElementById('editProjectForm').style.display = 'none';
    document.getElementById('tutorialContainer').style.display = 'none';
    document.getElementById('publicContainer').style.display = 'none';
    document.getElementById('userProjectsContainer').style.display = 'none';
    document.getElementById('pendingUsersContainer').style.display = 'none';
    document.getElementById('messagesContainer').style.display = 'none';
    document.getElementById('messageContainer').style.display = 'none';
    document.getElementById('typeFilterContainer').style.display = 'block';
    document.getElementById('projectsContainer').style.display = 'flex';
    loadProjects();
};

// Fungsi Load Projects
async function loadProjects(type = '') {
    try {
        const projectsContainer = document.getElementById('projectsContainer');
        projectsContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        let q = db.collection('projects');
        if (type) {
            q = q.where('type', '==', type);
        }
        const snapshot = await q.get();
        projectsContainer.innerHTML = '';
        if (snapshot.empty) {
            projectsContainer.innerHTML = '<p class="text-center">No projects found</p>';
            return;
        }

        const user = auth.currentUser;
        let userData = null;
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                userData = userDoc.data();
            }
        }

        snapshot.forEach(doc => {
            const project = doc.data();
            if (project.type === 'Tools' && (!userData || !userData.allowedTools) && !userData?.isAdmin) {
                return; // Skip Tools projects if user doesn't have access
            }
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
                        ${userData && (userData.isAdmin || project.addedBy === userData.username) ? `
                            <button class="btn btn-primary me-2" onclick="showEditProjectForm('${doc.id}')">Edit</button>
                            <button class="btn btn-danger me-2" onclick="deleteProject('${doc.id}')">Delete</button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="showTutorial('${doc.id}')">View Tutorial</button>
                    </div>
                </div>
            `;
            projectsContainer.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        alert('Failed to load projects: ' + error.message);
    }
}

// Fungsi Filter Projects by Type
window.filterProjectsByType = function filterProjectsByType(type) {
    loadProjects(type);
};

// Fungsi Show Edit Project Form
window.showEditProjectForm = async function showEditProjectForm(projectId) {
    try {
        const doc = await db.collection('projects').doc(projectId).get();
        if (!doc.exists) {
            alert('Project not found');
            return;
        }
        const project = doc.data();
        const user = auth.currentUser;
        if (!user) {
            alert('Please login first');
            return;
        }
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            alert('User data not found');
            return;
        }
        const userData = userDoc.data();
        if (!userData.allowedTools && project.type === 'Tools' && !userData.isAdmin) {
            alert('You do not have permission to edit Tools projects. Please request access from admin.');
            showMessageForm();
            return;
        }

        document.getElementById('editProjectName').value = project.name;
        document.getElementById('editProjectType').value = project.type;
        document.getElementById('editProjectLink').value = project.link;
        document.getElementById('editProjectDescription').value = project.description;
        document.getElementById('editStartDate').value = project.startDate;
        document.getElementById('editEndDate').value = project.endDate;
        document.getElementById('editProjectStatus').value = project.status;
        document.getElementById('editProjectForm').dataset.projectId = projectId;
        document.getElementById('projectsContainer').style.display = 'none';
        document.getElementById('editProjectForm').style.display = 'block';
        document.getElementById('editProjectMessage').textContent = '';
    } catch (error) {
        console.error('Error loading project:', error);
        alert('Failed to load project: ' + error.message);
    }
};

// Fungsi Update Project
window.updateProject = async function updateProject() {
    try {
        const projectId = document.getElementById('editProjectForm').dataset.projectId;
        const projectName = document.getElementById('editProjectName').value.trim();
        const projectType = document.getElementById('editProjectType').value;
        const projectLink = document.getElementById('editProjectLink').value.trim();
        const projectDescription = document.getElementById('editProjectDescription').value.trim();
        const startDate = document.getElementById('editStartDate').value;
        const endDate = document.getElementById('editEndDate').value;
        const status = document.getElementById('editProjectStatus').value;
        const editProjectMessage = document.getElementById('editProjectMessage');
        editProjectMessage.textContent = '';

        const user = auth.currentUser;
        if (!user) {
            editProjectMessage.textContent = 'Please login first';
            return;
        }
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            editProjectMessage.textContent = 'User data not found';
            return;
        }
        const userData = userDoc.data();
        if (!userData.allowedTools && projectType === 'Tools' && !userData.isAdmin) {
            alert('You do not have permission to edit Tools projects. Please request access from admin.');
            showMessageForm();
            return;
        }

        if (!projectName || !projectType || !projectLink || !projectDescription || !startDate || !endDate) {
            editProjectMessage.textContent = 'Please fill all fields';
            return;
        }

        if (!projectLink.match(/^https?:\/\/.+/)) {
            editProjectMessage.textContent = 'Please enter a valid URL';
            return;
        }

        await db.collection('projects').doc(projectId).update({
            name: projectName,
            type: projectType,
            link: projectLink,
            description: projectDescription,
            startDate,
            endDate,
            status
        });
        alert('Project updated successfully');
        showProjects();
    } catch (error) {
        console.error('Error updating project:', error);
        document.getElementById('editProjectMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Delete Project
window.deleteProject = async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (projectDoc.exists && projectDoc.data().imageUrl) {
            const imageRef = storage.refFromURL(projectDoc.data().imageUrl);
            await imageRef.delete().catch(error => console.warn('Error deleting image:', error));
        }
        await db.collection('projects').doc(projectId).delete();
        alert('Project deleted successfully');
        loadProjects();
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project: ' + error.message);
    }
};

// Fungsi Show Tutorial
window.showTutorial = async function showTutorial(projectId) {
    try {
        const doc = await db.collection('projects').doc(projectId).get();
        if (!doc.exists) {
            alert('Project not found');
            return;
        }
        const project = doc.data();
        const user = auth.currentUser;
        if (!user && project.type === 'Tools') {
            alert('Please login to view Tools projects.');
            showLogin();
            return;
        }
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                alert('User data not found');
                return;
            }
            const userData = userDoc.data();
            if (!userData.allowedTools && project.type === 'Tools' && !userData.isAdmin) {
                alert('You do not have permission to view Tools projects. Please request access from admin.');
                showMessageForm();
                return;
            }
        }

        document.getElementById('tutorialProjectName').textContent = project.name;
        document.getElementById('tutorialProjectLink').href = project.link;
        document.getElementById('tutorialProjectLink').textContent = project.link;
        document.getElementById('tutorialDescription').textContent = project.description;
        document.getElementById('projectsContainer').style.display = 'none';
        document.getElementById('tutorialContainer').style.display = 'block';
    } catch (error) {
        console.error('Error loading tutorial:', error);
        alert('Failed to load tutorial: ' + error.message);
    }
};

// Fungsi Show Pending Users
window.showPendingUsers = async function showPendingUsers() {
    try {
        const user = auth.currentUser;
        const manageUsersMessage = document.getElementById('manageUsersMessage');
        manageUsersMessage.textContent = '';

        if (!user) {
            manageUsersMessage.textContent = 'Please login first';
            showLogin();
            return;
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            manageUsersMessage.textContent = 'User data not found';
            await auth.signOut();
            return;
        }

        const userData = userDoc.data();
        if (!userData.isAdmin) {
            console.error('Access denied: Not an admin');
            manageUsersMessage.textContent = 'Access denied: Admins only';
            showProjects();
            return;
        }

        console.log('Fetching pending users for admin:', userData.username);
        document.getElementById('actionsContainer').style.display = 'none';
        document.getElementById('pendingUsersContainer').style.display = 'block';
        document.getElementById('messagesContainer').style.display = 'none';
        document.getElementById('messageContainer').style.display = 'none';
        const pendingUsersList = document.getElementById('pendingUsersList');
        const approvedUsersList = document.getElementById('approvedUsersList');
        pendingUsersList.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        approvedUsersList.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';

        // Load pending users
        const pendingSnapshot = await db.collection('pendingUsers').get();
        console.log('Pending users snapshot size:', pendingSnapshot.size);
        pendingUsersList.innerHTML = '';
        if (pendingSnapshot.empty) {
            pendingUsersList.innerHTML = '<p class="text-center">No pending users</p>';
        } else {
            pendingSnapshot.forEach(doc => {
                const userData = doc.data();
                const div = document.createElement('div');
                div.className = 'd-flex justify-content-between align-items-center p-2 border-bottom';
                div.innerHTML = `
                    <span>${userData.username} (${userData.email})</span>
                    <div>
                        <button class="btn btn-success me-2" onclick="approveUser('${doc.id}')">Approve</button>
                        <button class="btn btn-danger" onclick="rejectUser('${doc.id}')">Reject</button>
                    </div>
                `;
                pendingUsersList.appendChild(div);
            });
        }

        // Load approved users
        const approvedSnapshot = await db.collection('users').get();
        console.log('Approved users snapshot size:', approvedSnapshot.size);
        approvedUsersList.innerHTML = '';
        if (approvedSnapshot.empty) {
            approvedUsersList.innerHTML = '<p class="text-center">No approved users</p>';
        } else {
            approvedSnapshot.forEach(doc => {
                const userData = doc.data();
                const div = document.createElement('div');
                div.className = 'd-flex justify-content-between align-items-center p-2 border-bottom';
                div.innerHTML = `
                    <span>${userData.username} (${userData.email})</span>
                    <div>
                        <button class="btn btn-primary me-2" onclick="toggleToolsAccess('${doc.id}', ${!userData.allowedTools})">
                            ${userData.allowedTools ? 'Disable Tools' : 'Enable Tools'}
                        </button>
                        <button class="btn btn-danger" onclick="removeUser('${doc.id}', '${userData.username}')">Remove</button>
                    </div>
                `;
                approvedUsersList.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Error showing pending users:', error);
        document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Approve User
window.approveUser = async function approveUser(pendingUserId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login first');
            return;
        }

        const adminDoc = await db.collection('users').doc(user.uid).get();
        if (!adminDoc.exists || !adminDoc.data().isAdmin) {
            alert('Access denied: Admins only');
            return;
        }

        const doc = await db.collection('pendingUsers').doc(pendingUserId).get();
        if (!doc.exists) {
            alert('User not found');
            return;
        }

        const userData = doc.data();
        // Buat user di Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.password);
        const newUser = userCredential.user;

        // Simpan data user ke Firestore
        await db.collection('users').doc(newUser.uid).set({
            username: userData.username,
            email: userData.email,
            isAdmin: false,
            allowedTools: false,
            createdAt: userData.createdAt
        });

        // Hapus dari pendingUsers
        await db.collection('pendingUsers').doc(pendingUserId).delete();
        alert('User approved successfully');
        showPendingUsers();
    } catch (error) {
        console.error('Error approving user:', error);
        document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Reject User
window.rejectUser = async function rejectUser(pendingUserId) {
    if (!confirm('Are you sure you want to reject this user?')) return;
    try {
        await db.collection('pendingUsers').doc(pendingUserId).delete();
        alert('User rejected successfully');
        showPendingUsers();
    } catch (error) {
        console.error('Error rejecting user:', error);
        document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Remove User
window.removeUser = async function removeUser(userId, username) {
    if (!confirm(`Are you sure you want to remove user ${username}? This action cannot be undone.`)) return;
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login first');
            return;
        }

        const adminDoc = await db.collection('users').doc(user.uid).get();
        if (!adminDoc.exists || !adminDoc.data().isAdmin) {
            alert('Access denied: Admins only');
            return;
        }

        if (user.uid === userId) {
            alert('You cannot remove your own account');
            return;
        }

        // Hapus data user dari Firestore
        await db.collection('users').doc(userId).delete();
        alert(`User ${username} removed successfully`);
        showPendingUsers();
    } catch (error) {
        console.error('Error removing user:', error);
        document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Toggle Tools Access
window.toggleToolsAccess = async function toggleToolsAccess(userId, allowedTools) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login first');
            return;
        }

        const adminDoc = await db.collection('users').doc(user.uid).get();
        if (!adminDoc.exists || !adminDoc.data().isAdmin) {
            alert('Access denied: Admins only');
            return;
        }

        await db.collection('users').doc(userId).update({ allowedTools });
        alert('Tools access updated successfully');
        showPendingUsers();
    } catch (error) {
        console.error('Error updating tools access:', error);
        document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Show User Projects
window.showUserProjects = async function showUserProjects() {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login first');
            showLogin();
            return;
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            alert('User data not found');
            await auth.signOut();
            return;
        }

        const userData = userDoc.data();
        document.getElementById('actionsContainer').style.display = 'none';
        document.getElementById('userProjectsContainer').style.display = 'block';
        document.getElementById('messagesContainer').style.display = 'none';
        document.getElementById('messageContainer').style.display = 'none';
        document.getElementById('projectsContainer').style.display = 'none';
        document.getElementById('publicContainer').style.display = 'none';
        document.getElementById('pendingUsersContainer').style.display = 'none';
        document.getElementById('addProjectForm').style.display = 'none';
        document.getElementById('editProjectForm').style.display = 'none';
        document.getElementById('tutorialContainer').style.display = 'none';
        document.getElementById('typeFilterContainer').style.display = 'none';
        const userProjectsList = document.getElementById('userProjectsList');
        userProjectsList.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        const snapshot = await db.collection('projects').where('addedBy', '==', userData.username).get();
        userProjectsList.innerHTML = '';
        if (snapshot.empty) {
            userProjectsList.innerHTML = '<p class="text-center">No projects found</p>';
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
                        <button class="btn btn-primary me-2" onclick="showEditProjectForm('${doc.id}')">Edit</button>
                        <button class="btn btn-danger me-2" onclick="deleteProject('${doc.id}')">Delete</button>
                        <button class="btn btn-secondary" onclick="showTutorial('${doc.id}')">View Tutorial</button>
                    </div>
                </div>
            `;
            userProjectsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading user projects:', error);
        alert('Failed to load user projects: ' + error.message);
    }
};

// Fungsi Go Back
window.goBack = function goBack() {
    showProjects();
};

// Fungsi Show Add Project Form
window.showAddProjectForm = function showAddProjectForm() {
    document.getElementById('actionsContainer').style.display = 'none';
    document.getElementById('addProjectForm').style.display = 'block';
    document.getElementById('addProjectMessage').textContent = '';
    document.getElementById('projectName').value = '';
    document.getElementById('projectType').value = 'Testnet';
    document.getElementById('projectLink').value = '';
    document.getElementById('projectDescription').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('projectImage').value = '';
};

// Fungsi Show Message Form
window.showMessageForm = function showMessageForm() {
    document.getElementById('actionsContainer').style.display = 'none';
    document.getElementById('addProjectForm').style.display = 'none';
    document.getElementById('editProjectForm').style.display = 'none';
    document.getElementById('tutorialContainer').style.display = 'none';
    document.getElementById('publicContainer').style.display = 'none';
    document.getElementById('userProjectsContainer').style.display = 'none';
    document.getElementById('pendingUsersContainer').style.display = 'none';
    document.getElementById('projectsContainer').style.display = 'none';
    document.getElementById('typeFilterContainer').style.display = 'none';
    document.getElementById('messagesContainer').style.display = 'none';
    document.getElementById('messageContainer').style.display = 'block';
    document.getElementById('messageError').textContent = '';
};

// Fungsi Close Message Form
window.closeMessageForm = function closeMessageForm() {
    showProjects();
};

// Fungsi Send Message
window.sendMessage = async function sendMessage() {
    try {
        const messageContent = document.getElementById('messageContent').value.trim();
        const messageError = document.getElementById('messageError');
        messageError.textContent = '';

        if (!messageContent) {
            messageError.textContent = 'Please enter a message';
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            messageError.textContent = 'Please login first';
            showLogin();
            return;
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            messageError.textContent = 'User data not found';
            await auth.signOut();
            return;
        }

        const userData = userDoc.data();
        const adminSnapshot = await db.collection('users').where('isAdmin', '==', true).limit(1).get();
        if (adminSnapshot.empty) {
            messageError.textContent = 'No admin found';
            return;
        }
        const adminData = adminSnapshot.docs[0].data();
        const adminId = adminSnapshot.docs[0].id;

        await db.collection('messages').add({
            senderId: user.uid,
            senderUsername: userData.username,
            receiverId: adminId,
            receiverUsername: adminData.username,
            content: messageContent,
            timestamp: new Date().toISOString(),
            read: false
        });

        alert('Message sent successfully');
        document.getElementById('messageContent').value = '';
        showMessages();
    } catch (error) {
        console.error('Error sending message:', error);
        document.getElementById('messageError').textContent = 'Error: ' + error.message;
    }
};

// Fungsi Show Messages
window.showMessages = async function showMessages() {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please login first');
            showLogin();
            return;
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            alert('User data not found');
            await auth.signOut();
            return;
        }

        const userData = userDoc.data();
        document.getElementById('actionsContainer').style.display = 'none';
        document.getElementById('addProjectForm').style.display = 'none';
        document.getElementById('editProjectForm').style.display = 'none';
        document.getElementById('tutorialContainer').style.display = 'none';
        document.getElementById('publicContainer').style.display = 'none';
        document.getElementById('userProjectsContainer').style.display = 'none';
        document.getElementById('pendingUsersContainer').style.display = 'none';
        document.getElementById('projectsContainer').style.display = 'none';
        document.getElementById('typeFilterContainer').style.display = 'none';
        document.getElementById('messageContainer').style.display = 'none';
        document.getElementById('messagesContainer').style.display = 'block';

        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';

        const snapshot = await db.collection('messages')
            .where('senderId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .get();

        const adminSnapshot = await db.collection('messages')
            .where('receiverId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .get();

        const allMessages = [];
        snapshot.forEach(doc => allMessages.push({ id: doc.id, ...doc.data() }));
        adminSnapshot.forEach(doc => allMessages.push({ id: doc.id, ...doc.data() }));
        allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        messagesList.innerHTML = '';
        if (allMessages.length === 0) {
            messagesList.innerHTML = '<p class="text-center">No messages found</p>';
            return;
        }

        allMessages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'p-2 border-bottom';
            div.innerHTML = `
                <p><strong>${msg.senderUsername} to ${msg.receiverUsername}:</strong> ${msg.content}</p>
                <p><small>${new Date(msg.timestamp).toLocaleString()}</small></p>
                ${msg.senderId === user.uid ? '' : `
                    <textarea class="form-control mb-2" id="reply_${msg.id}" rows="2" placeholder="Reply..."></textarea>
                    <button class="btn btn-primary" onclick="sendReply('${msg.id}')">Reply</button>
                `}
            `;
            messagesList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
        alert('Failed to load messages: ' + error.message);
    }
};

// Fungsi Send Reply
window.sendReply = async function sendReply(messageId) {
    try {
        const replyContent = document.getElementById(`reply_${messageId}`).value.trim();
        if (!replyContent) {
            alert('Please enter a reply');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            alert('Please login first');
            showLogin();
            return;
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            alert('User data not found');
            await auth.signOut();
            return;
        }

        const userData = userDoc.data();
        const originalMessage = await db.collection('messages').doc(messageId).get();
        if (!originalMessage.exists) {
            alert('Message not found');
            return;
        }

        const originalData = originalMessage.data();
        await db.collection('messages').add({
            senderId: user.uid,
            senderUsername: userData.username,
            receiverId: originalData.senderId,
            receiverUsername: originalData.senderUsername,
            content: replyContent,
            timestamp: new Date().toISOString(),
            read: false
        });

        alert('Reply sent successfully');
        showMessages();
    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Error sending reply: ' + error.message);
    }
};

// Load Public Projects on Page Load
async function loadPublicProjects() {
    try {
        const publicProjectsList = document.getElementById('publicProjectsList');
        publicProjectsList.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        const snapshot = await db.collection('projects').where('status', '==', 'Berjalan').get();
        publicProjectsList.innerHTML = '';
        if (snapshot.empty) {
            publicProjectsList.innerHTML = '<p class="text-center">No public projects</p>';
            return;
        }

        const user = auth.currentUser;
        let userData = null;
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                userData = userDoc.data();
            }
        }

        snapshot.forEach(doc => {
            const project = doc.data();
            if (project.type === 'Tools' && (!userData || !userData.allowedTools) && !userData?.isAdmin) {
                return; // Skip Tools projects for unauthorized users
            }
            const div = document.createElement('div');
            div.className = 'col-md-4 mb-4';
            div.innerHTML = `
                <div class="card h-100">
                    ${project.imageUrl ? `<img src="${project.imageUrl}" class="card-img-top" alt="${project.name}" style="max-height: 200px; object-fit: cover;">` : ''}
                    <div class="card-body">
                        <h5 class="card-title">${project.name}</h5>
                        <p class="card-text"><strong>Type:</strong> ${project.type}</p>
                        <p class="card-text"><strong>Added By:</strong> ${project.addedBy}</p>
                        <button class="btn btn-primary" onclick="showTutorial('${doc.id}')">View Tutorial</button>
                    </div>
                </div>
            `;
            publicProjectsList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading public projects:', error);
        alert('Failed to load public projects: ' + error.message);
    }
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    try {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    console.log('User data not found, creating new document for:', user.uid);
                    const userData = {
                        username: user.email.split('@')[0],
                        email: user.email,
                        isAdmin: user.email === 'leviathan@lfarm.com',
                        allowedTools: user.email === 'leviathan@lfarm.com',
                        createdAt: { timestamp: new Date().toISOString() }
                    };
                    await db.collection('users').doc(user.uid).set(userData);
                    localStorage.setItem('user', JSON.stringify({ id: user.uid, ...userData }));
                }

                const userData = JSON.parse(localStorage.getItem('user'));
                console.log('User loaded:', userData);
                document.getElementById('navbarUsername').textContent = userData.username;
                document.getElementById('loginContainer').style.display = 'none';
                document.getElementById('logoutButton').style.display = 'block';
                document.getElementById('navbarUsername').style.display = 'inline-block';
                document.getElementById('messagesButton').style.display = 'inline-block';
                document.getElementById('actionsContainer').style.display = 'block';
                if (userData.isAdmin) {
                    document.getElementById('pendingUsersButton').style.display = 'inline-block';
                }
            } else {
                console.log('No user signed in');
                localStorage.removeItem('user');
                showLogin();
            }
            loadPublicProjects();
        });
    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Failed to initialize page: ' + error.message);
    }
});