/* eslint-disable no-undef */
/** @type {Worker} */
const w = new Worker('json_manager.js');
/** @type {HTMLElement} */
const listContainer = document.getElementById('listContainer');
/** @type {HTMLElement} */
const container = document.getElementById('result');
/** @type {HTMLInputElement} */
const searchBar = document.getElementById('search');
/** @description Size of divs generated */
const divSize = 115;
/** @description container element initial offset top */
const topPos = container.offsetTop;
/** @description Last calculated position */
let lastKnownScrollPosition = 0;
/** @description search results positions */
let resultIndex = [];
/** @description Search string */
let search = '';
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
  lastKnownScrollPosition = listContainer.scrollTop;
  emitValue('onscroll', lastKnownScrollPosition);
};

/**
 * Reset search environment
 */
const resetSearch = () => {
  const searchResultNodes = document.getElementsByClassName('search-result');
  for (const searchResultNode of searchResultNodes) searchResultNode.classList.remove('search-result');
  searchResult = undefined;
  search = '';
  resultIndex = [];
};

/**
 * Remove search-result style if loaded node
 * @param {number} i index of element to remove style
 */
const removeSearchResultStyle = i => {
  const node = document.getElementById(`element-${i}`);
  if (node !== null) node.classList.remove('search-result');
};

/**
 * Add search-result style if loaded node
 * @param {number} i index of the element to add style
 */
const addSearchResultStyle = i => {
  const node = document.getElementById(`element-${i}`);
  if (node !== null) node.classList.add('search-result');
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
    if (node !== null) node.classList.add('search-result');
    gotoIndex(resultIndex[nextIndex]);
  } else {
    /** If search has changed obtain data */
    search = searchBar.value;
    resultIndex = [];
    removeSearchResultStyle(searchResult);
    emitValue('onsearch', { search, position: lastKnownScrollPosition });
  }
};

/**
 * Creates a div with the provided data and position it in the container
 * @param {object} data Data from the json file
 * @param {number} i Index of the data passed
 */
const fillDiv = (data, i) => {
  const calcDate = (dataDate) => {
    const nDate = new Date(dataDate);
    return `${nDate.getMonth()}.${nDate.getFullYear().toString().substring(2, 4)}`
  } 

  window.requestAnimationFrame(_ => {
    const elementString = `
    <div id="element-${i}" class="element is-active ${searchResult === i ? 'search-result' : ''}" style="height:${divSize}px;top:${divSize * i}px">
      <div class="photo_container">
        <div class="image_container"> <img src="${data.picture.thumbnail}"> </div>
        <p> ${calcDate(data.registered.date)} </p>
      </div>
      <div class="content_container">
        <h2 class="profile_name">${data.name.first} ${data.name.last}</h2>
        <a href="mailto:${data.email}?subject=Cosas&body=Infinite scroll email">${data.email}</a>
        <div class="location">
          <p class="location_firstline">${data.location.street.number} ${data.location.street.name}, ${data.location.city}</p>
          <p class="location_secondline">${data.location.postcode} ${data.location.country}</p>
        </div>
      </div>
      <div class="link_container">
        <span class="message_badge"></span>
        <span class="phone_number"></span>
      </div>
    </div>
    `
    const element = document.createRange().createContextualFragment(elementString);
    container.appendChild(element);
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
  console.log(listContainer.clientHeight);
  listContainer.scrollTo(0, i * divSize + topPos - (listContainer.clientHeight - divSize) / 2);
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
    case 'initial':
      // On loaded json in the worker initialize div and pass element height to the worker (val = num_items)
      initialize(data.val);
      emitValue('initialized', { navHeight: listContainer.clientHeight, divSize });
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
listContainer.addEventListener(
  'scroll',
  () => {
    if (scrollAnimationFrame) window.cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = window.requestAnimationFrame(() => onScroll());
  },
  false
);

let searchAnimationFrame;
searchBar.addEventListener('keydown', e => {
  if (searchAnimationFrame) window.cancelAnimationFrame(searchAnimationFrame);
  searchAnimationFrame = window.requestAnimationFrame(() => {
    if (e.key === 'Enter' && searchBar.value !== '') onSearch();
    if (searchBar.value === '' && searchResult !== undefined) resetSearch();
  });
});
