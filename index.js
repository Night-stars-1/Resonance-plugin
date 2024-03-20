import fs from 'node:fs'

logger.info('------(ˊ·ω·ˋ)------')
logger.info('Resonance-plugin载入成功!')
logger.info('Created By Night-stars-1')
logger.info('-------------------')

const files = fs.readdirSync('./plugins/Resonance-plugin/apps').filter(file => file.endsWith('.js'))

let ret = []
files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }
