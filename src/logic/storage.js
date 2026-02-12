const USERS_KEY = 'ccp_engine_users';
const CURRENT_USER_KEY = 'ccp_engine_current_user';

// Initialize default user if not exists
const initializeStorage = () => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (!users.find(u => u.username === 'hemhalatha')) {
        users.push({
            username: 'hemhalatha',
            password: 'welcome',
            onboarded: false,
            bankDetails: null
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
};

initializeStorage();

export const login = (username, password) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        return user;
    }
    throw new Error('Invalid username or password');
};

export const signup = (username, password) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find(u => u.username === username)) {
        throw new Error('Username already exists');
    }
    const newUser = {
        username,
        password,
        onboarded: false,
        bankDetails: null
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return newUser;
};

export const getCurrentUser = () => {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
};

export const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
};

export const updateOnboarding = (bankDetails) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const userIndex = users.findIndex(u => u.username === currentUser.username);

    if (userIndex !== -1) {
        users[userIndex].onboarded = true;
        users[userIndex].bankDetails = bankDetails;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
        return users[userIndex];
    }
};
