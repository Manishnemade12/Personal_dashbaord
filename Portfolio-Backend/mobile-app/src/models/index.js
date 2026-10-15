/**
 * Independent Data Models for Mobile App
 * Matches MongoDB / Mongoose schemas from root models/
 */

export const BlogModel = {
  createDefault: () => ({
    _id: '',
    title: '',
    slug: '',
    images: [],
    description: '',
    blogcategory: [],
    tags: [],
    status: 'draft', // 'publish' | 'draft'
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  validate: (data) => {
    if (!data.title?.trim()) return 'Title is required';
    return null;
  },
};

export const ProjectModel = {
  createDefault: () => ({
    _id: '',
    title: '',
    slug: '',
    images: [],
    description: '',
    client: '',
    projectcategory: [],
    tags: [],
    livepreview: '',
    status: 'draft', // 'publish' | 'draft'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  validate: (data) => {
    if (!data.title?.trim()) return 'Project title is required';
    return null;
  },
};

export const SkillModel = {
  createDefault: () => ({
    _id: '',
    title: '',
    description: '',
    images: [],
    createdAt: new Date().toISOString(),
  }),
  validate: (data) => {
    if (!data.title?.trim()) return 'Skill title is required';
    return null;
  },
};

export const PhotoModel = {
  createDefault: () => ({
    _id: '',
    title: '',
    images: [],
    createdAt: new Date().toISOString(),
  }),
  validate: (data) => {
    if (!data.images || data.images.length === 0) return 'At least one image URL is required';
    return null;
  },
};

export const ContactModel = {
  createDefault: () => ({
    _id: '',
    name: '',
    lname: '',
    email: '',
    company: '',
    phone: '',
    country: '',
    price: '',
    description: '',
    project: [],
    createdAt: new Date().toISOString(),
  }),
};

export const ShopModel = {
  createDefault: () => ({
    _id: '',
    title: '',
    slug: '',
    images: [],
    description: '',
    tags: [],
    price: '',
    status: 'draft',
    createdAt: new Date().toISOString(),
  }),
  validate: (data) => {
    if (!data.title?.trim()) return 'Product title is required';
    return null;
  },
};

export const ProfileModel = {
  createDefault: () => ({
    _id: '',
    name: '',
    email: '',
    bio: '',
    role: 'Full Stack Developer',
    github: '',
    linkedin: '',
    twitter: '',
  }),
};
