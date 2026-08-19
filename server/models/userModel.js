// In-memory data store for users (fallback mode)
let users = [];

export const getMemoryUserByEmail = (email) => {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
};

export const getMemoryUserById = (id) => {
  return users.find(u => u.id === id) || null;
};

export const createMemoryUser = (userData) => {
  const newUser = {
    id: `usr-${Date.now()}`,
    name: userData.name,
    email: userData.email.toLowerCase(),
    password: userData.password,
    city: userData.city || 'San Francisco',
    bio: userData.bio || '',
    occupation: userData.occupation || 'Student',
    avatar: userData.avatar || '',
    role: 'Event Host & Attendee',
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  return newUser;
};

export const updateMemoryUser = (id, updateData) => {
  const user = users.find(u => u.id === id || u.email.toLowerCase() === (updateData.email || '').toLowerCase());
  if (!user) return null;
  Object.assign(user, updateData);
  return user;
};
