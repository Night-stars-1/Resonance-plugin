import fs from 'fs'

const oldRoleData = JSON.parse(fs.readFileSync('roleData.json'))

const id2name = {}
const name2id = {}
const EnglishName2id = {}

oldRoleData.forEach(item => {
  if (item.mod === '玩家角色') {
    const idCN = item.idCN.split('/')
    console.log(idCN)
    id2name[item.id] = {
      name: item.name,
      rank: Number(idCN[1].slice(1, 2)),
      EnglishName: item.EnglishName.toLowerCase()
    }
    name2id[item.name] = {
      id: item.id,
      rank: Number(idCN[1].slice(1, 2)),
      EnglishName: item.EnglishName.toLowerCase()
    }
    EnglishName2id[item.EnglishName.toLowerCase()] = {
      id: item.id,
      rank: Number(idCN[1].slice(1, 2)),
      name: item.name
    }
  }
})

fs.writeFileSync('id2name.json', JSON.stringify(id2name, null, 2), 'utf-8')
fs.writeFileSync('name2id.json', JSON.stringify(name2id, null, 2), 'utf-8')
fs.writeFileSync('EnglishName2id.json', JSON.stringify(EnglishName2id, null, 2), 'utf-8')
