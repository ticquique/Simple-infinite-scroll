/* eslint-disable no-undef */
/** @type {Worker} */
const w = new Worker('json_manager.js');
/** @type {HTMLElement} */
const container = document.getElementById('result');
/** @type {HTMLInputElement} */
const searchBar = document.getElementById('search');
const divSize = 50;
const topPos = container.offsetTop;
let lastKnownScrollPosition = 0;
/** @var Search results positions */
let resultIndex = [];

/**
 * Initialize container size to the calculated by the div size * number of items
 * @param {number} num Number of items in the json file
 */
const initialize = (num) => {
  container.style.height = `${num * divSize}px`;
};

// Reference: http://www.html5rocks.com/en/tutorials/speed/animations/
/**
 * Manage scroll event
 * @param {function} cb Function to execute before the timeout between scrolls is finished
 */
const onScroll = () => {
  lastKnownScrollPosition = window.scrollY;
  emitValue('onscroll', lastKnownScrollPosition);
};

/**
 * Manage search event
 * @param {KeyboardEvent} e Keyboard key pressed
 */
const onSearch = () => {
  const search = searchBar.value;
  resultIndex = [];
  emitValue('onsearch', { search, position: lastKnownScrollPosition });
};

/**
 * Creates a div with the provided data and position it in the container
 * @param {object} data Data from the json file
 * @param {number} i Index of the data passed
 */
const fillDiv = (data, i) => {
  window.requestAnimationFrame((_) => {
    const element = document.createElement('div');
    element.id = `element-${i}`;
    element.classList.add('element');
    element.style.height = `${divSize}px`;
    element.style.top = `${divSize * i}px`;
    const image = document.createElement('img');
    const name = document.createElement('p');
    image.src = data.picture;
    name.innerHTML = data.name;
    name.appendChild(image);
    element.appendChild(name);
    element.classList.add('is-active');
    container.appendChild(element);
  });
};

/**
 * Destroy the div with the provided index inside the container
 * @param {number} i Index of the element to destroy
 */
const unsetDiv = (i) => {
  window.requestAnimationFrame((_) => {
    const node = document.getElementById(`element-${i}`);
    if (node !== null) {
      container.removeChild(node);
    }
  });
};

/**
 * Force to scroll to center the index position
 * @param {number} i Position to scroll to relative to results container
 */
const gotoIndex = (i) => {
  window.scrollTo(0, i + topPos - (window.innerHeight - divSize) / 2);
};

// UTILS

const emitValue = (cmd, val) => {
  w.postMessage({ cmd, val });
};


// MANAGE RECEIVED WORKER MESSAGES

w.onmessage = (e) => {
  const data = e.data;
  switch (data.cmd) {
    case 'initial':
      // On loaded json in the worker initialize div and pass element height to the worker (val = num_items)
      initialize(data.val);
      emitValue('initialized', { navHeight: window.innerHeight, divSize });
      break;
    case 'addData':
      // Add data message means the div creation (data = content, index = index)
      fillDiv(data.val.data, data.val.index);
      break;
    case 'removeData':
      // Remove data message means div destruction (val = index)
      unsetDiv(data.val);
      break;
    case 'searchResult':
      // Append result to resultIndex and if first result scroll to it (val = offset to top from element)
      resultIndex.push(data.val);
      if (resultIndex.length === 1) gotoIndex(data.val);
      break;
    default:
      break;
  }
};

// WINDOW LISTENERS

/**
 * Add scroll listener and wait to the timeout have passed
 */
window.addEventListener('scroll', (_) => {
  window.requestAnimationFrame(() => {
    onScroll();
  });
});

searchBar.addEventListener('keydown', (e) => {
  window.requestAnimationFrame(() => {
    onSearch();
  });
});
