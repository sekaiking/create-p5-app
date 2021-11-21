#!/usr/bin/env node

const inquirer = require("inquirer");
const fs = require("fs");
const ejs = require("ejs");
const p = require("path");
const { exec } = require("child_process");

const TEMPLATES = fs.readdirSync(`${__dirname}/templates`);
const CURRENT_DIR = process.cwd();
const ARGS = process.argv.slice(2);

const LIBRARIES = ["p5.sound", "ml5"];

const QUESTIONS = [
  {
    name: "project-choice",
    type: "list",
    message: "What project template would you like to use?",
    choices: TEMPLATES,
    default: "static-html",
  },
  {
    name: "project-name",
    type: "input",
    message: "Project name:",
    validate: function (input) {
      if (/^([A-Za-z\-\_\d])+$/.test(input)) return true;
      else
        return "Project name may only include letters, numbers, underscores and hashes.";
    },
  },
  {
    name: "libraries-choices",
    type: "checkbox",
    message: "What libraries would you like to include?",
    choices: LIBRARIES,
  },
  {
    name: "use-min",
    type: "list",
    message: "Do you want to use the minified version of the scripts?",
    choices: ["yes", "no"],
  },
];

inquirer.prompt(QUESTIONS).then((answers) => {
  console.log("Starting the generator...");

  const projectChoice = answers["project-choice"];
  const projectName = answers["project-name"];
  const projectLibs = answers["libraries-choices"];
  const projectMin = answers["use-min"];

  const templatePath = `${__dirname}/templates/${projectChoice}`;

  const workingPath = (ARGS[0] || CURRENT_DIR) + "/" + projectName;

  createFolder(workingPath);
  console.log("Created project folder");

  createContents(templatePath, workingPath);
  console.log("Copyed project template");

  if (projectChoice == "static-html") {
    createHtml(
      workingPath + "/src/index.ejs",
      workingPath + "/src/index.html",
      {
        title: projectName,
        useMin: projectMin == "yes",
        libs: projectLibs,
      }
    );
    console.log("Generated Index.html");
  }

  createPackage(workingPath + "/package.json", {
    name: projectName,
  });
  console.log("Generated Package.json");

  console.log("Installing packages... (this may take a while)");
  exec(`cd ${workingPath} && npm install`);
});

function createFolder(path) {
  fs.mkdirSync(path, { recursive: true });
}

function createContents(path, newPath) {
  const filesToIgnore = ["dist", "node_modules", "yarn.lock", ".parcel-cache"];

  const filesToCreate = fs.readdirSync(path);
  filesToCreate.forEach((file) => {
    const origFilePath = `${path}/${file}`;

    const stats = fs.statSync(origFilePath);

    if (filesToIgnore.includes(p.basename(origFilePath))) {
      return;
    }
    if (stats.isFile()) {
      const contents = fs.readFileSync(origFilePath, "utf8");

      const writePath = `${newPath}/${file}`;
      fs.writeFileSync(writePath, contents, "utf8");
    } else if (stats.isDirectory()) {
      fs.mkdirSync(`${newPath}/${file}`);

      // recursive call
      createContents(`${path}/${file}`, `${newPath}/${file}`);
    }
  });
}

function createHtml(path, newPath, options) {
  const filesToCreate = fs.readFileSync(path, "utf-8");
  const template = ejs.render(filesToCreate, options);

  fs.unlinkSync(path);
  fs.writeFileSync(newPath, template, "utf8");
}

function createPackage(path, options) {
  const oldFile = JSON.parse(fs.readFileSync(path, "utf-8"));

  let newFile = { ...oldFile, ...options };

  fs.writeFileSync(path, JSON.stringify(newFile, null, 2), "utf-8");
}
