import fetch from 'node-fetch'

export async function getBoss () {
  let data = {
    data: {}
  }

  logger.info('正在获取BOSS信息')
  const response = await fetch('https://goda.srap.link/getBoss', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: ''
  })
  data = await response.json()

  logger.info('=== 记录拉取完成 ===')
  return data.data
}
