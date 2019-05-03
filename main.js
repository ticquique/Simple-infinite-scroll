/* eslint-disable no-undef */
/** @type {Worker} */
const w = new Worker("json_manager.js");
/** @type {HTMLElement} */
const container = document.getElementById("result");
/** @type {HTMLInputElement} */
const searchBar = document.getElementById("search");
/** @description Size of divs generated */
const divSize = 50;
/** @description container element initial offset top */
const topPos = container.offsetTop;
/** @description Last calculated position */
let lastKnownScrollPosition = 0;
/** @description search results positions */
let resultIndex = [];
/** @description Search string */
let search = "";
/** @description Search current index */
let searchResult;

/**
 * Initialize container size to the calculated by the div size * number of items
 * @param {number} num Number of items in the json file
 */
const initialize = num => {
  container.style.height = `${num * divSize}px`;
};

// Reference: http://www.html5rocks.com/en/tutorials/speed/animations/
/**
 * Manage scroll event
 * @param {function} cb Function to execute before the timeout between scrolls is finished
 */
const onScroll = () => {
  lastKnownScrollPosition = window.scrollY;
  emitValue("onscroll", lastKnownScrollPosition);
};

/**
 * Reset search environment
 */
const resetSearch = () => {
  const searchResultNodes = document.getElementsByClassName("search-result");
  for (const searchResultNode of searchResultNodes) searchResultNode.classList.remove("search-result");
  searchResult = undefined;
  resultIndex = [];
};

/**
 * Remove search-result style if loaded node
 * @param {number} i index of element to remove style
 */
const removeSearchResultStyle = i => {
  const node = document.getElementById(`element-${i}`);
  if (node !== null) node.classList.remove("search-result");
};

/**
 * Add search-result style if loaded node
 * @param {number} i index of the element to add style
 */
const addSearchResultStyle = i => {
  const node = document.getElementById(`element-${i}`);
  if (node !== null) node.classList.add("search-result");
};
/**
 * Manage search event
 * @param {KeyboardEvent} e Keyboard key pressed
 */
const onSearch = () => {
  if (search === searchBar.value) {
    /** If search hasnt changed get next */
    const index = resultIndex.indexOf(searchResult);
    let nextIndex = index + 1;
    if (nextIndex >= resultIndex.length) nextIndex = 0;
    const node = document.getElementById(`element-${searchResult}`);
    removeSearchResultStyle(index);
    if (node !== null) node.classList.add("search-result");
    gotoIndex(resultIndex[nextIndex]);
  } else {
    /** If search has changed obtain data */
    search = searchBar.value;
    resultIndex = [];
    removeSearchResultStyle(searchResult);
    emitValue("onsearch", { search, position: lastKnownScrollPosition });
  }
};

/**
 * Creates a div with the provided data and position it in the container
 * @param {object} data Data from the json file
 * @param {number} i Index of the data passed
 */
const fillDiv = (data, i) => {
  window.requestAnimationFrame(_ => {
    const element = document.createElement("div");
    element.id = `element-${i}`;
    element.classList.add("element");
    element.style.height = `${divSize}px`;
    element.style.top = `${divSize * i}px`;
    const image = document.createElement("img");
    const name = document.createElement("p");
    image.src = data.picture;
    name.innerHTML = data.name;
    name.appendChild(image);
    element.appendChild(name);
    element.classList.add("is-active");
    container.appendChild(element);
    if (searchResult === i) element.classList.add("search-result");
  });
};

/**
 * Destroy the div with the provided index inside the container
 * @param {number} i Index of the element to destroy
 */
const unsetDiv = i => {
  window.requestAnimationFrame(_ => {
    const node = document.getElementById(`element-${i}`);
    if (node !== null) container.removeChild(node);
  });
};

/**
 * Force to scroll to center the index position
 * @param {number} i Position to scroll to relative to results container
 */
const gotoIndex = i => {
  searchResult = i;
  window.scrollTo(0, i * divSize + topPos - (window.innerHeight - divSize) / 2);
};

/**
 * Emits a value to the worker
 * @param {string} cmd Type of message to send to the worker
 * @param {any} val Value passed as message
 */
const emitValue = (cmd, val) => {
  w.postMessage({ cmd, val });
};

/**
 * Listener that manage received messages from the worker
 */
w.onmessage = e => {
  const data = e.data;
  switch (data.cmd) {
    case "initial":
      // On loaded json in the worker initialize div and pass element height to the worker (val = num_items)
      initialize(data.val);
      emitValue("initialized", { navHeight: window.innerHeight, divSize });
      break;
    case "addData":
      // Add data message means the div creation (data = content, index = index)
      fillDiv(data.val.data, data.val.index);
      break;
    case "removeData":
      // Remove data message means div destruction (val = index)
      unsetDiv(data.val);
      break;
    case "searchResult":
      // Append result to resultIndex and if first result scroll to it (val = offset to top from element)
      resultIndex.push(data.val);
      if (resultIndex.length === 1) {
        /** First element authomatically move to index */
        gotoIndex(data.val);
        addSearchResultStyle(data.val);
      }
      break;
    default:
      break;
  }
};

// WINDOW LISTENERS

/**
 * Add scroll listener and wait to the timeout have passed
 */
let scrollAnimationFrame;
window.addEventListener(
  "scroll",
  () => {
    if (scrollAnimationFrame) window.cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = window.requestAnimationFrame(() => onScroll());
  },
  false
);

let searchAnimationFrame;
searchBar.addEventListener("keydown", e => {
  if (searchAnimationFrame) window.cancelAnimationFrame(searchAnimationFrame);
  searchAnimationFrame = window.requestAnimationFrame(() => {
    if (e.key === "Enter" && searchBar.value !== "") onSearch();
    if (searchBar.value === "" && searchResult !== undefined) resetSearch();
  });
});
