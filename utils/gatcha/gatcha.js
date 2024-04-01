import fetch from 'node-fetch'

export async function getRecords (pid, remoteId) {
  let page = 1
  let data = {
    data: {}
  }
  let records = []
  let name = ''
  let uid = 0
  do {
    logger.info(`正在获取第${page}页`)
    const response = await fetch('https://goda.srap.link/getRecruitRecords', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
      },
      body: JSON.stringify({
        pid,
        remote_id: remoteId,
        pageNum: page
      })
    })
    data = await response.json()
    name = data.data.user_name
    uid = data.data.uid
    records.push(...data.data.card_records)
    // 延迟500ms，防止请求过快
    await new Promise(resolve => setTimeout(resolve, 500))
    page++
  } while (page <= Math.ceil(data.data.record_cnt / 25))

  logger.info('=== 记录拉取完成 ===')
  return { records, name, uid }
}
