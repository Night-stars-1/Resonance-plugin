import fs from 'fs'
import path from 'path'
import { pluginResources } from './path.js'

const rulePrefix = '(#|\\*)?(雷索|纳斯|雷索纳斯)'

function readJSON (filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath))
  } else {
    return []
  }
}
const id2name = readJSON(path.join(pluginResources, 'role', 'id2name.json'))
const name2id = readJSON(path.join(pluginResources, 'role', 'name2id.json'))

function getIdByName (id) {
  return name2id[id]
}

function getNameById (name) {
  return id2name[name]
}

export {
  rulePrefix,
  getIdByName,
  getNameById
}
