const build = (data) => {
  // *************************************************************************
  // HELPER FUNCTIONS --------------------------------------------------------
  // *************************************************************************

  const waterfall = (arg, tasks, cb) => {
    const waterfallcb = (error, res) => {
      if (error) { return cb(error); }
      n += 1;
      if (n === tasks.length) {
        tasks[n - 1](res, cb);
      } else {
        tasks[n - 1](res, waterfallcb);
      }
    };
    let n = 0;
    waterfallcb(null, arg);
  }

  // *************************************************************************
  // HANDLE THE DATA ---------------------------------------------------------
  // *************************************************************************

  const filterCountryData = (data) => {
    return data
      .filter( country => country.date && country.childpop )
      .sort( (a, b) => a.date - b.date );
  }

  const groupByPropertySegment = (data, prop, value, sectionLength) => {
    let currentSegment = data[0][prop];

    const initialObj = {total:0};
    initialObj[currentSegment] = [];

    return data.reduce( (acc, item) => {
      const section = item[prop];
      const nextSection = currentSegment + sectionLength;
      currentSegment = section > nextSection ? nextSection : currentSegment;
      if (!acc[currentSegment]) acc[currentSegment] = [item[value]];
      else acc[currentSegment].push(item[value]);

      acc.total += 1;
      return acc;
    }, initialObj);
  }

  const handleData = (data, cb) => {
    const filteredCountries = filterCountryData(data);
    cb(null, groupByPropertySegment(filteredCountries, 'date', 'name', 4));
  }

  // *************************************************************************
  // BUILD THE GRAPH ---------------------------------------------------------
  // *************************************************************************

  function buildGraph(data, cb) {
    // access graph on DOM
    const canvas = document.getElementById('graph');
    const wrap = window.getComputedStyle(document.querySelector('#graph-wrap'));
    const borderWidth = +(2 * wrap.borderWidth.slice(0, -2));

    // build graph
    canvas.width = +(wrap.width.slice(0, -2)) - borderWidth;
    canvas.height = 480;

    // get graph context
    const ctx = canvas.getContext('2d');

    // ---------------------------------
    // set up responsive graph variables
    const margin = 40;
    const startY = canvas.height - margin;
    const startX = 50;

    // amount to move between sections
    const moveByX = Math.floor((canvas.width - margin) / (Object.keys(data).length - 1));
    const moveByY = Math.round((canvas.height - margin) / data.total) - 1;

    // define graph section variability
    const maxRadius = 0.034 * canvas.width;
    const minRadius = 0.02 * canvas.width;
    // define radius addition per item on graph
    const radius = (maxRadius - minRadius) / data.total;

    // define graph responsive font size
    const minFontSize = 12;
    const size = Math.floor(0.025 * canvas.width) > 12 ? Math.floor(0.025 * canvas.width) : minFontSize;

    // current position on graph
    let xPos = startX;
    let yPos = startY;

    // define canvas options
    ctx.strokeStyle = '#2196F3';
    ctx.fillStyle = '#2196F3';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // plot current total for graph points
    let accumulatedNumber = 0;

    // plot graph for each date
    Object.keys(data).forEach((value, index) => {
      if (value === 'total') return;

      contents = data[value];

      accumulatedNumber += contents.length;
      // first graph item
      if (!index) {
        ctx.beginPath();
        ctx.fillStyle = '#2196F3';
        ctx.arc(xPos, yPos, minRadius, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.closePath();
        ctx.fillStyle = '#eee';
        ctx.fillText(accumulatedNumber, xPos, yPos);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText(value, xPos, yPos + 30);
        return;
      }
      // the rest
      ctx.beginPath();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.moveTo(xPos, yPos);
      xPos += moveByX;
      yPos -= moveByY * contents.length;
      ctx.lineTo(xPos, yPos);
      ctx.stroke();
      ctx.closePath();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#2196F3';
      ctx.beginPath();
      ctx.arc(xPos, yPos, (radius * accumulatedNumber) + minRadius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(accumulatedNumber, xPos, yPos);
      ctx.fillText(value, xPos, startY + 30);

    });

    cb(null, [data, moveByX, startX]);
  }

  // *************************************************************************
  // ADD HOVER LISTS FOR EACH GRAPH SECTION ----------------------------------
  // *************************************************************************
  var hovers = ([data, sectionWidth, startX], cb) => {
    const canvas = document.getElementById('graph');
    const canvasLeft = Math.round(canvas.getBoundingClientRect().left);

    // get list of graph sections
    const dataKeys = Object.keys(data).slice(0, -1);

    // build hover sections for each segment of the graph
    let section = startX - (sectionWidth / 2);
    const sections = dataKeys.map(() => {
      return Math.round(section += sectionWidth);
    });

    var getMouse = (e) => {
      // find out if mouse is over a section
      const mouseX = e.clientX - canvasLeft;
      let currentSection = sections.findIndex(a => mouseX < a);

      if (currentSection === -1) {
        resetText();
      } else {
        const lastValue = new Date().getFullYear() + 1;
        const nextValue = dataKeys[currentSection + 1] || lastValue;
        buildText(data, dataKeys[currentSection], nextValue);
      }
    }

    function buildText (data, displayValue, nextValue) {
      // reset list to an empty node
      const list = document.querySelector('.list');
      list.innerHTML = '';

      // add title to list
      const title = document.createElement('h2');
      title.innerText = `${displayValue}-${+(nextValue) - 1}`;
      list.appendChild(title);

      // add graph data to list
      data[displayValue].forEach(entry => {
        const el = document.createElement('p');
        el.innerText = entry;
        list.appendChild(el);
      });
    }

    function resetText() {
      document.querySelector('.list').innerHTML = '<h1>Hover graph for further information</h1>';
    }

    function remove() {
      canvas.removeEventListener('mousemove', getMouse);
      window.removeEventListener('resize', remove);
    }

    window.addEventListener('resize', remove);
    canvas.addEventListener('mousemove', getMouse);
    canvas.addEventListener('mouseout', resetText);

    cb(null, data);
  };

  // *************************************************************************
  // COMBINE EVERYTHING ------------------------------------------------------
  // *************************************************************************

  const createGraph = (data => {
    const url = 'https://gist.githubusercontent.com/finnhodgkin/4b12d304c3109fa337f09ec6d57200c3/raw/087a6ce15fb619085f7410759684df2ab170577a/cor-pun.json';
    waterfall(data, [handleData, buildGraph, hovers], (err, res) => {
      if (err) console.log(err);
    });
  })(data);
};

const fetch = (url, cb) => {
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        cb(null, JSON.parse(xhr.responseText));
      } else {
        cb(true);
      }
    }
  };
  xhr.open('GET', url, true);
  xhr.send();
};

fetch('https://gist.githubusercontent.com/finnhodgkin/4b12d304c3109fa337f09ec6d57200c3/raw/087a6ce15fb619085f7410759684df2ab170577a/cor-pun.json',
  (err, data) => {
    if (err) console.log(err);
    else build(data);

    window.addEventListener('resize', () => {
      build(data);
    });
});
