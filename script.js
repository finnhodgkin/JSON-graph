function hovers(listObj, list, startX, sectionWidth) {
  const canvas = document.getElementById('graph');
  const canvasLeft = Math.round(canvas.getBoundingClientRect().left);

  let mouseX = 0;
  const sections = [];
  let section = startX - (sectionWidth / 2);

  list.forEach(() => {
    sections.push(Math.round(section));
    section += sectionWidth;
  });

  function getMouse(e) {
    mouseX = e.clientX - canvasLeft;
    let currentSection = sections.findIndex(a => mouseX < a);
    if (currentSection === -1) currentSection = sections.length;
    if (listObj[list[currentSection - 1]]) {
      let pre = list[currentSection - 2] + 1;
      pre = pre && pre !== list[currentSection - 1] ? `${pre} - ` : '';
      document.querySelector('.list').innerHTML = `<h2>${pre} ${list[currentSection - 1]}</h2><p>${listObj[list[currentSection - 1]].join(',</p><p>')}</p>`;
    }
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
}

function buildGraph(data) {
  const dates = [];
  const datesObj = {};
  const last = data[data.length - 1].date;
  const canvas = document.getElementById('graph');
  const wrap = window.getComputedStyle(document.querySelector('#graph-wrap'));
  const bW = +(2 * wrap.borderWidth.slice(0, -2));
  canvas.width = +(wrap.width.slice(0, -2)) - bW;
  canvas.height = 500 - 20;
  const ctx = canvas.getContext('2d');
  let total = 1;
  let nextDate = 1;
  // add dates in segments
  for (let i = data[0].date; i < last; i += 4) {
    datesObj[i] = [];
    dates.push(i);
  }
  datesObj[last] = [];
  dates.push(last);
  // add countries to date segments
  data.forEach((el) => {
    if (el.date >= dates[nextDate]) {
      datesObj[dates[nextDate]].push(el.name);
      nextDate += 1;
    } else {
      datesObj[dates[nextDate - 1]].push(el.name);
    }
  });
  // set up responsive graph variables
  const moveBy = Math.floor((canvas.width - 40) / dates.length);
  const moveByY = Math.round((canvas.height - 40) / data.length) - 1;
  const bottom = Math.floor(canvas.height - 40);
  const startX = 50;
  const maxRadius = 0.034 * canvas.width;
  const minRadius = 0.02 * canvas.width;
  const radius = (maxRadius - minRadius) / data.length;
  const size = Math.floor(0.025 * canvas.width) > 12 ? Math.floor(0.025 * canvas.width) : 12;
  let xPos = startX;
  let yPos = bottom - 10;
  ctx.strokeStyle = '#2196F3';
  ctx.fillStyle = '#2196F3';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // plot graph for each date
  dates.forEach((el, i) => {
    // first graph item
    if (!i) {
      ctx.beginPath();
      ctx.fillStyle = '#2196F3';
      ctx.arc(xPos, yPos, minRadius, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.closePath();
      ctx.fillStyle = '#eee';
      ctx.fillText(total, xPos, yPos);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(dates[i], xPos, bottom + 20);
      return;
    }
    // the rest
    ctx.beginPath();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.moveTo(xPos, yPos);
    xPos += moveBy;
    yPos -= moveByY * datesObj[dates[i]].length;
    ctx.lineTo(xPos, yPos);
    ctx.stroke();
    ctx.closePath();
    total += datesObj[dates[i]].length;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(xPos, yPos, (radius * total) + minRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(total, xPos, yPos);
    ctx.fillText(dates[i], xPos, bottom + 20);
  });

  hovers(datesObj, dates, startX, moveBy);
}

function build(json) {
  const list = [];
  function filterJSON() {
    const links = {};
    const graph = list.filter((e) => {
      if (e.date) links[e.link] = links[e.link] ? 2 : 1;
      return e.date && links[e.link] < 2 && e.childpop;
    }).sort((a, b) => a.date - b.date);
    buildGraph(graph);
  }
  fetch(json)
    .then(blob => blob.json())
    .then((data) => {
      list.push(...data);
      filterJSON();
    });
}

build('https://gist.githubusercontent.com/finnhodgkin/4b12d304c3109fa337f09ec6d57200c3/raw/087a6ce15fb619085f7410759684df2ab170577a/cor-pun.json');

window.addEventListener('resize', () => {
  build('https://gist.githubusercontent.com/finnhodgkin/4b12d304c3109fa337f09ec6d57200c3/raw/087a6ce15fb619085f7410759684df2ab170577a/cor-pun.json');
});
