/* One palette for the whole scene, kept close to js/pixel.js so the 3D view looks like the same world. */
export const PAL = {
  ink: '#0d1117', cream: '#f7f1de', paper: '#f2ead6', bone: '#e9e2cf', white: '#ffffff',
  gold: '#f5c542', goldD: '#b8862a', goldL: '#ffe58a', amber: '#ffb627', orange: '#e8892b',
  red: '#c8442f', redD: '#8e2a22', redL: '#e8735a',
  brown: '#8a5a3b', brownD: '#553826', brownL: '#b4794c',
  wood: '#a87a48', woodD: '#7d5630', woodL: '#c9975c',
  sand: '#dcb984', sandD: '#a98358', sandL: '#f0d9aa',
  green: '#4a9b46', greenL: '#86c95c', greenD: '#2f6b37', greenX: '#1d452b',
  blue: '#4d8fd6', blueD: '#2b5aa8', blueL: '#8cc4f0', cyan: '#6fd3e0', teal: '#2e8ca0', tealD: '#1f5f73',
  purple: '#a06bd6', purpleD: '#6a3f9e', pink: '#e08aa8',
  steel: '#a3afc2', steelD: '#5d6a84', steelL: '#d4dcea', mirror: '#c5e8f4',
  slate: '#4a5068', slateD: '#363b50', slateL: '#61698a',
  houseW: '#f0eee4', houseD: '#d5d1c2', houseX: '#a9a595',
  stone1: '#2c364e', stone2: '#3a4664', stone3: '#4c5c80', stone4: '#6a7da5', stone5: '#8ea1c7'
};

/* terrain surface */
export const GRASS = ['#4a9b46', '#54a549', '#5fae4f', '#44903f', '#68b653'];
export const GRASS_LIP = '#7fcf66';
export const ROCK_TOP = ['#3a4260', '#414a69', '#363d58', '#454e70', '#3d4563'];
export const SOIL = ['#7a5336', '#6b4630', '#86603f', '#5e3f29'];
export const STRATA = ['#59688f', '#485777', '#6b7ca3', '#3a4664', '#52618a'];

/* floors of the carved rooms: two tones that alternate per cell */
export const FLOORS = {
  stone: ['#8b89ab', '#9895b7'], wood: ['#c08d54', '#b58348'], woodDark: ['#7d5630', '#8a6036'], tile: ['#8e99ae', '#9aa5ba'],
  water: ['#2b5aa8', '#3a76bd'], mud: ['#8a5a3b', '#7d4f33'], concrete: ['#8189a8', '#8a92b0'], sandstone: ['#a58a5a', '#b39767'],
  coal: ['#4a4d5e', '#555869'], ice: ['#6b8fb8', '#7aa0c8'], sand: ['#dcb984', '#d2ab73'], rockfloor: ['#7a6c5c', '#85776a'],
  steel: ['#8a97ae', '#7a879e'], brickRed: ['#7a3a30', '#6a3029'], abyss: ['#080a10', '#0b0e16']
};
/* the walls that face into a carved room */
export const WALLS = {
  stone: ['#3a4670', '#323d63', '#434f7a'], wood: ['#9a7a58', '#a88865', '#8c6d4d'], woodDark: ['#5c4029', '#4a3220', '#684a30'],
  tile: ['#8a94a6', '#7f899b', '#949eb0'], water: ['#2f4670', '#37507c', '#283d63'], mud: ['#5e3f29', '#6f4b31', '#523622'],
  concrete: ['#4f5874', '#596380', '#454d67'], sandstone: ['#8c7448', '#9a8053', '#7d673f'], coal: ['#22242f', '#2b2e3b', '#1b1d27'],
  ice: ['#7aa0c8', '#6a90b8', '#8ab0d8'], sand: ['#b09565', '#9c8258', '#7a6440'], rockfloor: ['#5d5044', '#6b5d50', '#51463c'],
  steel: ['#5d6a84', '#6a7790', '#505d76'], brickRed: ['#5e2a22', '#6a3029', '#4d221c'], abyss: ['#05060a', '#080a10', '#05060a']
};
export const KIND_LIST = ['solid', 'stone', 'wood', 'woodDark', 'tile', 'water', 'mud', 'concrete', 'sandstone', 'coal', 'ice', 'sand', 'rockfloor', 'steel', 'brickRed', 'abyss'];
export const KIND_ID = {}; KIND_LIST.forEach((k, i) => { KIND_ID[k] = i; });

export const RAINBOW = ['#c8442f', '#e8892b', '#f5c542', '#4a9b46', '#4d8fd6', '#a06bd6'];
