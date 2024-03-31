import json

with open('data/HomeGoodsQuotationFactory.json', 'r', encoding='utf-8') as file:
	HomeGoodsQuotationFactory = json.load(file)

with open('data/HomeStationFactory.json', 'r', encoding='utf-8') as file:
	HomeStationFactory = json.load(file)

with open('data/HomeGoodsFactory.json', 'r', encoding='utf-8') as file:
	HomeGoodsFactory = json.load(file)
	goods_data = {}
	for goods in HomeGoodsFactory:
		id: int = goods["id"]
		goods_data[id] = goods


with open('data/HomeLineFactory.json', 'r', encoding='utf-8') as file:
	HomeLineFactory = json.load(file)

city_goods_info = {}
for city_goods_data in HomeGoodsQuotationFactory:
	idCN: str = city_goods_data["idCN"]
	id: int = city_goods_data["goodsId"]
	city = idCN.split("/")[0].replace("七号自由港", "7号自由港").replace("澄明中心", "澄明数据中心").replace("发电站", "阿妮塔能源研究所").replace("战备工厂", "阿妮塔战备工厂")
	name = idCN.split("/")[-1]
	isSpeciality = goods_data[id]["isSpeciality"]

	if city not in city_goods_info:
		city_goods_info[city] = {}
	city_goods_info[city][name] = {
		"num": city_goods_data["num"],
		"isSpeciality": isSpeciality
	}

with open('CityGoodsData.json', 'w', encoding='utf-8') as file:
	file.write(json.dumps(city_goods_info, ensure_ascii=False, sort_keys=True, indent=4, separators=(',', ':')))

city_info = {}
cityId2Name = {}
for city_data in HomeStationFactory:
	name = city_data["name"]
	cityId2Name[city_data["id"]] = name
	if ("repRewardList" not in city_data): continue
	rep_reward_list: list = city_data["repRewardList"]
	for rep_reward in rep_reward_list:
		if name not in city_info:
			city_info[name] = [{
				"buyNum": rep_reward["buyNum"],
				"revenue": rep_reward["revenue"]
			}]
		city_info[name].append({
			"buyNum": rep_reward["buyNum"],
			"revenue": rep_reward["revenue"]
		})


with open('CityData.json', 'w', encoding='utf-8') as file:
	file.write(json.dumps(city_info, ensure_ascii=False, sort_keys=True, indent=4, separators=(',', ':')))

attachedToCity = {}
for city_data in HomeStationFactory:
	attached_id = city_data["attachedToCity"]
	attachedToCity[city_data["name"]] = cityId2Name[attached_id] if (attached_id != -1) else city_data["name"]

with open('AttachedToCityData.json', 'w', encoding='utf-8') as file:
	file.write(json.dumps(attachedToCity, ensure_ascii=False, sort_keys=True, indent=4, separators=(',', ':')))

city_route_info = []
for line_data in HomeLineFactory:
	id = line_data["id"]
	from_city_id = line_data["station01"]
	to_city_id = line_data["station02"]
	from_city = cityId2Name[from_city_id]
	to_city = cityId2Name[to_city_id]
	distance = line_data["distance"]
	city_route_info.append({
		"from": from_city,
		"to": to_city,
		"distance": distance
	})


inf = float('inf')
# 构建图的邻接矩阵
def create_graph(edges: list):
	nodes = set()
	for edge in edges:
		nodes.add(edge['from'])
		nodes.add(edge['to'])
	# 构建站点集合，转换成列表以便索引
	nodes = list(nodes)
	# 构建站点编号映射
	node_index = {node: i for i, node in enumerate(nodes)}
	index2name = {i: node for i, node in enumerate(nodes)}

	inf = float('inf')
	n = len(nodes)
	# 初始化邻接站点的距离，全部为无穷大
	dist = [[inf for _ in range(n)] for _ in range(n)]
	# 把站点对自身的距离设置为0
	for i in range(n):
		dist[i][i] = 0

	# 填充邻接矩阵
	for edge in edges:
		u, v, w = node_index[edge['from']], node_index[edge['to']], edge['distance']
		dist[u][v] = w
		dist[v][u] = w  # 无向图，添加对称站点的距离

	# Floyd-Warshall 算法
	# 中间节点
	for k in range(n):
		# 待定起点
		for i in range(n):
			# 待定终点
			for j in range(n):
				if dist[i][k] + dist[k][j] < dist[i][j]:
					dist[i][j] = dist[i][k] + dist[k][j]

	tired = {}
	# 输出最短路径
	for i in enumerate(dist):
		for j in enumerate(dist):
			if i[0] == j[0] or j[1][i[0]] == inf:
				continue
			tired[f'{index2name[i[0]]}-{index2name[j[0]]}'] = 24 if j[1][i[0]] <= 10000 else 24+round((j[1][i[0]]-10000)/1000)
	return tired

# 主程序
tired = create_graph(city_route_info)
print(tired)
with open('CityTiredData.json', 'w', encoding='utf-8') as file:
	file.write(json.dumps(tired, ensure_ascii=False, sort_keys=True, indent=4, separators=(',', ':')))