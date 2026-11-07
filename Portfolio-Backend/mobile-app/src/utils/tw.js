import { create } from 'twrnc';

// Create a customized instance of twrnc that uses our tailwind.config.js
const tw = create(require('../../tailwind.config.js'));

export default tw;

