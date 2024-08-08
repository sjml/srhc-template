import fs from "node:fs";
import path from "node:path";

import prand from "pure-rand";
import slugify from "@sindresorhus/slugify";
import { loremIpsum as lorem } from "lorem-ipsum";

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FOLDER = path.join(__dirname, "..", "lorem");

const NUM_WORDS_PER_TITLE_RANGE = [2, 5];
const NUM_WORDS_PER_HEADER_RANGE = [3, 8];
const NUM_WORDS_PER_SENTENCE_RANGE = [4, 20];
const NUM_SENTENCES_PER_PARAGRAPH_RANGE = [2, 12];
const NUM_PARAGRAPHS_PER_CHAPTER_RANGE = [15, 23];
const NUM_CHAPTERS_PER_SECTION_RANGE = [2, 7];
const NUM_SECTIONS_RANGE = [5, 12];

const seed = Date.now() ^ (Math.random() * 0x100000000);
console.log(`RANDOM SEED: ${seed}`);
const rng = prand.xoroshiro128plus(seed);

function randInt(min, max) {
  if (min >= max) {
    throw new Error(`${min} is not less than ${max}!!`);
  }
  return prand.unsafeUniformIntDistribution(min, max-1, rng);
}
function randFloat() {
  const g1 = prand.unsafeUniformIntDistribution(0, (1 << 24) - 1, rng);
  const value = g1 / (1 << 24);
  return value;
}
function randDouble() {
  const g1 = prand.unsafeUniformIntDistribution(0, (1 << 26) - 1, rng);
  const g2 = prand.unsafeUniformIntDistribution(0, (1 << 27) - 1, rng);
  const value = (g1 * Math.pow(2, 27) + g2) * Math.pow(2, -53);
  return value;
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (word, index, words) => {
    const isFirstOrLast = index === 0 || index + word.length === str.length;
    return isFirstOrLast || word.length >= 4
      ? word.charAt(0).toUpperCase() + word.slice(1)
      : word;
  });
}

let usedTitles = new Set();
function generateTitle(minLength, maxLength) {
  function makeTitle() {
    return lorem({
        count: randInt(minLength, maxLength),
        units: "words",
        random: randDouble,
      });
  }
  let t = makeTitle();
  while (usedTitles.has(t)) {
    t = makeTitle();
  }
  usedTitles.add(t);
  return toTitleCase(t);
}

function generateChapterContent(sectionIdx, chapterIdx) {
  const numGraphs = randInt(...NUM_PARAGRAPHS_PER_CHAPTER_RANGE);
  const chapTitle = generateTitle(...NUM_WORDS_PER_TITLE_RANGE);
  let content = lorem({
    count: numGraphs,
    units: "paragraphs",
    random: randDouble,
    paragraphLowerBound: NUM_SENTENCES_PER_PARAGRAPH_RANGE[0],
    paragraphUpperBound: NUM_SENTENCES_PER_PARAGRAPH_RANGE[1],
    sentenceLowerBound: NUM_WORDS_PER_SENTENCE_RANGE[0],
    sentenceUpperBound: NUM_WORDS_PER_SENTENCE_RANGE[1],
  });

  let graphs = content.split("\n");

  function markUpGraph(g) {
    const sentences = g.slice(0, -1).split(". ");
    if (sentences.length < 6 && randInt(0,100) < 10) {
      // make the occasional shorter paragraph into a blockquote
      return `> ${g}`;
    }
    if (sentences.length < 5 && randInt(0,100) < 10) {
      // make the occasional shorter paragraph into an unordered list
      return sentences.map(s => `* ${s}`).join("\n");
    }
    if (sentences.length < 5 && randInt(0,100) < 10) {
      // make the occasional shorter paragraph into an ordered list
      return sentences.map((s,i) => `${i+1}. ${s}`).join("\n");
    }
    for (let sIdx=0; sIdx < sentences.length; sIdx++) {
      if (randInt(0,100) < 90) {
        continue; // most sentences have no formatting
      }
      let s = sentences[sIdx];

      // not actually going to do this now; the dummy sets are more for the table
      //  of contents, not testing formatting. but for a day when it matters, here
      //  is where the bold, italics, feetnote, and links should be added.
      // maybe add some quotes to the text, too?

      sentences[sIdx] = s;
    }
    return `${sentences.join(". ")}.`;
  }
  graphs.forEach(function (g, gIdx) {
    this[gIdx] = markUpGraph(g);
  }, graphs);

  // put in some headers (h2 - h4)
  const firstHeaderIdx = randInt(2, 6);
  let header = generateTitle(...NUM_WORDS_PER_HEADER_RANGE);
  let currHeader = 2;
  graphs.splice(firstHeaderIdx, 0, `\n${"#".repeat(currHeader)} ${header}`);
  for (let hIdx = firstHeaderIdx + randInt(5, 10); hIdx < graphs.length; hIdx += randInt(5, 10)) {
    header = generateTitle(...NUM_WORDS_PER_HEADER_RANGE);
    let headerWalkRange = [-1, 2];
    if (currHeader == 2) {
      headerWalkRange = [0, 2];
    }
    if (currHeader == 6) {
      headerWalkRange = [-1, 1];
    }
    currHeader += randInt(...headerWalkRange);
    header = `\n${"#".repeat(currHeader)} ${header}`;
    graphs.splice(hIdx, 0, `\n${header}`);
  }

  content = graphs.join("\n\n");
  content += "\n";

  if (sectionIdx == 0 && chapterIdx == 0) {
    const fmtTestContent = fs.readFileSync(
      path.join(__dirname, "..", "resources", "demo-assets", "formatTest.md"))
      .toString("utf-8");
    content = "The following section is just so there is a sample of richer formatting early on in the book.\n\n" + fmtTestContent + "----\n\n" + content;
  }

  return [chapTitle, content];
}

const allContent = {};

const numSections = randInt(...NUM_SECTIONS_RANGE);
for (let sectIdx=0; sectIdx < numSections; sectIdx++) {
  const sectionTitle = generateTitle(...NUM_WORDS_PER_TITLE_RANGE);
  const sectionContent = {};

  const numChapters = randInt(...NUM_CHAPTERS_PER_SECTION_RANGE);
  for (let chapIdx=0; chapIdx < numChapters; chapIdx++) {
    const [chapTitle, chapContent] = generateChapterContent(sectIdx, chapIdx);

    const output = `---\ntitle: ${chapTitle}\norder: ${chapIdx+1}\n---\n\n${chapContent}`;
    const slug = slugify(chapTitle);
    sectionContent[slug] = output;
  }

  allContent[sectionTitle] = sectionContent;
}

let fileCount = 0;
let wordCounts = [];

let sectIdx = 0;
fs.rmSync(OUTPUT_FOLDER, {recursive: true, force: true});
fs.mkdirSync(OUTPUT_FOLDER);
for (const [sectionTitle, sectionContent] of Object.entries(allContent)) {
  const sectionSlug = `${sectIdx.toString().padStart(2, "0")}-${slugify(sectionTitle)}`;
  const sectDirPath = path.join(OUTPUT_FOLDER, sectionSlug);
  fs.mkdirSync(sectDirPath);
  const sectIndexPath = path.join(sectDirPath, "index.md");
  fs.writeFileSync(sectIndexPath, `---\ntitle: ${sectionTitle}\nlayout: sectionIndex\n---\n\n`);
  fileCount += 1;

  for (const [slug, content] of Object.entries(sectionContent)) {
    const contentPath = path.join(sectDirPath, `${slug}.md`);
    fs.writeFileSync(contentPath, content);
    fileCount += 1;
    wordCounts.push(content.split(/(\s+)/).length);
  }

  sectIdx += 1;
}

console.log(`Wrote ${fileCount} files in ${sectIdx} sections.`);
const wcTotal = wordCounts.reduce((a, b) => a + b, 0);
const wcAve = wcTotal / fileCount;
console.log(`Total word count: ${wcTotal.toLocaleString()}; averaging ${Math.ceil(wcAve).toLocaleString()} per file.`);
