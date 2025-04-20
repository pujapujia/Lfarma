// app.js
import config from './config.js';

// Pastikan firebase sudah dimuat dari <script> di HTML
const app = firebase.initializeApp(config.firebase);
const db = firebase.firestore();
const auth = firebase.auth();
console.log('Firebase initialized successfully');

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Fungsi untuk menampilkan form login
        function showLogin() {
            const loginContainer = document.getElementById('loginContainer');
            const registerContainer = document.getElementById('registerContainer');
            const resetPasswordContainer = document.getElementById('resetPasswordContainer');
            if (loginContainer) loginContainer.style.display = 'block';
            if (registerContainer) registerContainer.style.display = 'none';
            if (resetPasswordContainer) resetPasswordContainer.style.display = 'none';
        }

        // Fungsi untuk menampilkan form registrasi
        function showRegister() {
            const loginContainer = document.getElementById('loginContainer');
            const registerContainer = document.getElementById('registerContainer');
            const resetPasswordContainer = document.getElementById('resetPasswordContainer');
            if (loginContainer) loginContainer.style.display = 'none';
            if (registerContainer) registerContainer.style.display = 'block';
            if (resetPasswordContainer) resetPasswordContainer.style.display = 'none';
        }

        // Fungsi untuk menampilkan form reset password
        function showResetPassword() {
            const loginContainer = document.getElementById('loginContainer');
            const registerContainer = document.getElementById('registerContainer');
            const resetPasswordContainer = document.getElementById('resetPasswordContainer');
            if (loginContainer) loginContainer.style.display = 'none';
            if (registerContainer) registerContainer.style.display = 'none';
            if (resetPasswordContainer) resetPasswordContainer.style.display = 'block';
        }

        // Fungsi registrasi
        async function register() {
            try {
                const username = document.getElementById('registerUsername')?.value.trim();
                const email = document.getElementById('registerEmail')?.value.trim();
                const password = document.getElementById('registerPassword')?.value.trim();
                const registerMessage = document.getElementById('registerMessage');
                if (registerMessage) registerMessage.textContent = '';

                console.log('Register attempt:', { username, email });

                if (!username || !email || !password) {
                    if (registerMessage) registerMessage.textContent = 'Please fill all fields';
                    console.log('Missing fields:', { username, email, password });
                    return;
                }

                if (username.length < 3) {
                    if (registerMessage) registerMessage.textContent = 'Username must be at least 3 characters';
                    console.log('Invalid username length:', username);
                    return;
                }

                if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                    if (registerMessage) registerMessage.textContent = 'Please enter a valid email';
                    console.log('Invalid email format:', email);
                    return;
                }

                if (password.length < 6) {
                    if (registerMessage) registerMessage.textContent = 'Password must be at least 6 characters';
                    console.log('Invalid password length:', password);
                    return;
                }

                console.log('Checking existing pending users...');
                const pendingSnapshot = await db.collection('pendingUsers').where('email', '==', email).get();
                if (!pendingSnapshot.empty) {
                    if (registerMessage) registerMessage.textContent = 'Email is already pending approval';
                    console.log('Email already pending:', email);
                    return;
                }

                console.log('Checking existing approved users...');
                const userSnapshot = await db.collection('users').where('email', '==', email).get();
                if (!userSnapshot.empty) {
                    if (registerMessage) registerMessage.textContent = 'Email is already registered';
                    console.log('Email already registered:', email);
                    return;
                }

                const pendingUserData = {
                    username,
                    email,
                    password,
                    isAdmin: false,
                    allowedTools: false,
                    createdAt: { timestamp: new Date().toISOString() }
                };
                console.log('Saving pending user:', pendingUserData);
                await db.collection('pendingUsers').add(pendingUserData);
                console.log('Pending user saved successfully');
                alert('Registration submitted, awaiting admin approval');
                showLogin();
            } catch (error) {
                console.error('Error registering:', error);
                const registerMessage = document.getElementById('registerMessage');
                if (registerMessage) registerMessage.textContent = 'Error: ' + error.message;
            }
        }

        // Fungsi login
        async function login() {
            try {
                const email = document.getElementById('email')?.value.trim();
                const password = document.getElementById('password')?.value.trim();
                const loginMessage = document.getElementById('loginMessage');
                if (loginMessage) loginMessage.textContent = '';

                if (!email || !password) {
                    if (loginMessage) loginMessage.textContent = 'Please fill all fields';
                    return;
                }

                await auth.signInWithEmailAndPassword(email, password);
                console.log('Login successful');
            } catch (error) {
                console.error('Error logging in:', error);
                const loginMessage = document.getElementById('loginMessage');
                if (loginMessage) loginMessage.textContent = 'Error: ' + error.message;
            }
        }

        // Fungsi logout
        async function logout() {
            try {
                await auth.signOut();
                console.log('Logout successful');
                showLogin();
            } catch (error) {
                console.error('Error logging out:', error);
                alert('Error logging out: ' + error.message);
            }
        }

        // Fungsi reset password
        async function resetPassword() {
            try {
                const email = document.getElementById('resetEmail')?.value.trim();
                const resetMessage = document.getElementById('resetMessage');
                if (resetMessage) resetMessage.textContent = '';

                if (!email) {
                    if (resetMessage) resetMessage.textContent = 'Please enter an email';
                    return;
                }

                await auth.sendPasswordResetEmail(email);
                alert('Password reset email sent');
                showLogin();
            } catch (error) {
                console.error('Error resetting password:', error);
                const resetMessage = document.getElementById('resetMessage');
                if (resetMessage) resetMessage.textContent = 'Error: ' + error.message;
            }
        }

        // Fungsi untuk memuat proyek publik
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
                    if (project.type === 'Tools' && (!userData || (!userData.allowedTools && !userData.isAdmin))) {
                        return;
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

        // Fungsi untuk memperbarui jumlah pesan
        async function updateMessageCount() {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const snapshot = await db.collection('messages')
                    .where('receiverId', '==', user.uid)
                    .where('read', '==', false)
                    .get();

                const messageCount = document.getElementById('messageCount');
                if (messageCount) {
                    messageCount.textContent = snapshot.size;
                    messageCount.style.display = snapshot.empty ? 'none' : 'inline';
                }
            } catch (error) {
                console.error('Error updating message count:', error);
            }
        }

        // Fungsi untuk menampilkan pengguna tertunda (admin)
        async function showPendingUsers() {
            try {
                const user = auth.currentUser;
                const manageUsersMessage = document.getElementById('manageUsersMessage');
                if (manageUsersMessage) manageUsersMessage.textContent = '';

                if (!user) {
                    if (manageUsersMessage) manageUsersMessage.textContent = 'Please login first';
                    showLogin();
                    return;
                }

                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    if (manageUsersMessage) manageUsersMessage.textContent = 'User data not found';
                    await auth.signOut();
                    showLogin();
                    return;
                }

                const userData = userDoc.data();
                if (!userData.isAdmin) {
                    console.error('Access denied: Not an admin');
                    if (manageUsersMessage) manageUsersMessage.textContent = 'Access denied: Admins only';
                    return;
                }

                console.log('Fetching pending users for admin:', userData.username);
                const actionsContainer = document.getElementById('actionsContainer');
                const pendingUsersContainer = document.getElementById('pendingUsersContainer');
                const messagesContainer = document.getElementById('messagesContainer');
                const messageContainer = document.getElementById('messageContainer');
                const projectsContainer = document.getElementById('projectsContainer');
                const userProjectsContainer = document.getElementById('userProjectsContainer');
                const addProjectForm = document.getElementById('addProjectForm');
                const tutorialContainer = document.getElementById('tutorialContainer');
                if (actionsContainer) actionsContainer.style.display = 'none';
                if (pendingUsersContainer) pendingUsersContainer.style.display = 'block';
                if (messagesContainer) messagesContainer.style.display = 'none';
                if (messageContainer) messageContainer.style.display = 'none';
                if (projectsContainer) projectsContainer.style.display = 'none';
                if (userProjectsContainer) userProjectsContainer.style.display = 'none';
                if (addProjectForm) addProjectForm.style.display = 'none';
                if (tutorialContainer) tutorialContainer.style.display = 'none';

                const pendingUsersList = document.getElementById('pendingUsersList');
                const approvedUsersList = document.getElementById('approvedUsersList');
                if (pendingUsersList) {
                    pendingUsersList.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';
                }
                if (approvedUsersList) {
                    approvedUsersList.innerHTML = '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>';
                }

                const pendingSnapshot = await db.collection('pendingUsers').get();
                console.log('Pending users snapshot size:', pendingSnapshot.size);
                if (pendingUsersList) {
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
                                    <button class="btn btn-success me-2 approve-btn" data-id="${doc.id}">Approve</button>
                                    <button class="btn btn-danger reject-btn" data-id="${doc.id}">Reject</button>
                                </div>
                            `;
                            pendingUsersList.appendChild(div);
                        });

                        document.querySelectorAll('.approve-btn').forEach(button => {
                            button.addEventListener('click', () => approveUser(button.dataset.id));
                        });
                        document.querySelectorAll('.reject-btn').forEach(button => {
                            button.addEventListener('click', () => rejectUser(button.dataset.id));
                        });
                    }
                }

                const approvedSnapshot = await db.collection('users').get();
                console.log('Approved users snapshot size:', approvedSnapshot.size);
                if (approvedUsersList) {
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
                                    <button class="btn btn-primary me-2 tools-btn" data-id="${doc.id}" data-allowed="${userData.allowedTools}">
                                        ${userData.allowedTools ? 'Disable Tools' : 'Enable Tools'}
                                    </button>
                                    <button class="btn btn-danger remove-btn" data-id="${doc.id}" data-username="${userData.username}">Remove</button>
                                </div>
                            `;
                            approvedUsersList.appendChild(div);
                        });

                        document.querySelectorAll('.tools-btn').forEach(button => {
                            button.addEventListener('click', () => toggleToolsAccess(button.dataset.id, button.dataset.allowed === 'false'));
                        });
                        document.querySelectorAll('.remove-btn').forEach(button => {
                            button.addEventListener('click', () => removeUser(button.dataset.id, button.dataset.username));
                        });
                    }
                }
            } catch (error) {
                console.error('Error showing pending users:', error);
                const manageUsersMessage = document.getElementById('manageUsersMessage');
                if (manageUsersMessage) manageUsersMessage.textContent = 'Error: ' + error.message;
            }
        }

        // Fungsi untuk menyetujui pengguna
        async function approveUser(pendingId) {
            try {
                const pendingDoc = await db.collection('pendingUsers').doc(pendingId).get();
                if (!pendingDoc.exists) {
                    alert('Pending user not found');
                    return;
                }

                const pendingData = pendingDoc.data();
                const { email, password, username, isAdmin, allowedTools } = pendingData;

                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await db.collection('users').doc(user.uid).set({
                    username,
                    email,
                    isAdmin: isAdmin || false,
                    allowedTools: allowedTools || false,
                    createdAt: { timestamp: new Date().toISOString() }
                });

                await db.collection('pendingUsers').doc(pendingId).delete();
                alert('User approved successfully');
                showPendingUsers();
            } catch (error) {
                console.error('Error approving user:', error);
                alert('Error approving user: ' + error.message);
            }
        }

        // Fungsi untuk menolak pengguna
        async function rejectUser(pendingId) {
            try {
                await db.collection('pendingUsers').doc(pendingId).delete();
                alert('User rejected successfully');
                showPendingUsers();
            } catch (error) {
                console.error('Error rejecting user:', error);
                alert('Error rejecting user: ' + error.message);
            }
        }

        // Fungsi untuk mengaktifkan/menonaktifkan akses tools
        async function toggleToolsAccess(userId, enable) {
            try {
                await db.collection('users').doc(userId).update({
                    allowedTools: enable
                });
                alert(`Tools access ${enable ? 'enabled' : 'disabled'} successfully`);
                showPendingUsers();
            } catch (error) {
                console.error('Error toggling tools access:', error);
                alert('Error toggling tools access: ' + error.message);
            }
        }

        // Fungsi untuk menghapus pengguna
        async function removeUser(userId, username) {
            try {
                if (confirm(`Are you sure you want to remove ${username}?`)) {
                    await db.collection('users').doc(userId).delete();
                    alert('User removed successfully');
                    showPendingUsers();
                }
            } catch (error) {
                console.error('Error removing user:', error);
                alert('Error removing user: ' + error.message);
            }
        }

        // Event listener untuk tombol
        const loginButton = document.getElementById('loginButton');
        if (loginButton) loginButton.addEventListener('click', login);

        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) logoutButton.addEventListener('click', logout);

        const registerButton = document.getElementById('registerButton');
        if (registerButton) registerButton.addEventListener('click', showRegister);

        const submitRegisterButton = document.getElementById('submitRegisterButton');
        if (submitRegisterButton) submitRegisterButton.addEventListener('click', register);

        const backToLoginButton = document.getElementById('backToLoginButton');
        if (backToLoginButton) backToLoginButton.addEventListener('click', showLogin);

        const forgotPasswordButton = document.getElementById('forgotPasswordButton');
        if (forgotPasswordButton) forgotPasswordButton.addEventListener('click', showResetPassword);

        const resetPasswordButton = document.getElementById('resetPasswordButton');
        if (resetPasswordButton) resetPasswordButton.addEventListener('click', resetPassword);

        const backToLoginResetButton = document.getElementById('backToLoginResetButton');
        if (backToLoginResetButton) backToLoginResetButton.addEventListener('click', showLogin);

        const pendingUsersButton = document.getElementById('pendingUsersButton');
        if (pendingUsersButton) pendingUsersButton.addEventListener('click', showPendingUsers);

        // Inisialisasi auth state
        auth.onAuthStateChanged(async user => {
            try {
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
                    } else {
                        const userData = { id: user.uid, ...userDoc.data() };
                        localStorage.setItem('user', JSON.stringify(userData));
                    }

                    const userData = JSON.parse(localStorage.getItem('user'));
                    console.log('User loaded:', userData);

                    const usernameText = document.getElementById('usernameText');
                    if (usernameText) usernameText.textContent = userData.username;

                    const loginContainer = document.getElementById('loginContainer');
                    if (loginContainer) loginContainer.style.display = 'none';

                    const logoutButton = document.getElementById('logoutButton');
                    if (logoutButton) logoutButton.style.display = 'block';

                    const navbarUsername = document.getElementById('navbarUsername');
                    if (navbarUsername) navbarUsername.style.display = 'inline-block';

                    const messagesButton = document.getElementById('messagesButton');
                    if (messagesButton) messagesButton.style.display = 'inline-block';

                    const actionsContainer = document.getElementById('actionsContainer');
                    if (actionsContainer) actionsContainer.style.display = 'block';

                    const pendingUsersButton = document.getElementById('pendingUsersButton');
                    if (userData.isAdmin && pendingUsersButton) {
                        pendingUsersButton.style.display = 'inline-block';
                    }

                    await updateMessageCount();
                } else {
                    console.log('No user signed in');
                    localStorage.removeItem('user');

                    const loginContainer = document.getElementById('loginContainer');
                    if (loginContainer) loginContainer.style.display = 'block';

                    const logoutButton = document.getElementById('logoutButton');
                    if (logoutButton) logoutButton.style.display = 'none';

                    const navbarUsername = document.getElementById('navbarUsername');
                    if (navbarUsername) navbarUsername.style.display = 'none';

                    const messagesButton = document.getElementById('messagesButton');
                    if (messagesButton) messagesButton.style.display = 'none';

                    const pendingUsersButton = document.getElementById('pendingUsersButton');
                    if (pendingUsersButton) pendingUsersButton.style.display = 'none';

                    const actionsContainer = document.getElementById('actionsContainer');
                    if (actionsContainer) actionsContainer.style.display = 'none';
                }
                loadPublicProjects();
            } catch (error) {
                console.error('Error in auth state change:', error);
                alert('Failed to initialize page: ' + error.message);
            }
        });

        // Muat proyek publik saat halaman dimuat
        loadPublicProjects();
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
        alert('Failed to initialize application: ' + error.message);
    }
});