<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Member {
  id: number
  isLeader: boolean
  [key: string]: string | number | boolean
}

interface Group {
  id: number
  name: string
  color: string
  members: Member[]
}

const totalMembers = ref(1)
const members = ref<Member[]>([])

const MAX_FIELDS = 11
const customFields = ref<{ keyIndex: number, keyName: string }[]>([
  { keyIndex: 0, keyName: '俠名' },
  { keyIndex: 1, keyName: '性別' },
  { keyIndex: 2, keyName: '門派' },
])
const newField = ref('')

const addField = () => {
  const field = newField.value.trim()
  if (!field) return
  if (customFields.value.length >= MAX_FIELDS) {
    alert(`欄位數量已達上限（${MAX_FIELDS}個）`)
    return
  }
  const alreadyExists = customFields.value.some(f => f.keyName === field)
  if (!alreadyExists) {
    const newIndex = customFields.value.length
    customFields.value.push({ keyIndex: newIndex, keyName: field })
    members.value.forEach(m => {
      m[field] = ''
    })
  }
  newField.value = ''
}

const removeField = (fieldName: string) => {
  if (['id', 'isLeader'].includes(fieldName)) return
  customFields.value = customFields.value.filter(f => f.keyName !== fieldName)
  members.value.forEach(m => {
    delete m[fieldName]
  })
}

const removeMember = (id: number) => {
  members.value = members.value.filter(item => item.id !== id)

  // 正確更新每個 group 的 members 陣列
  groups.value = groups.value.map(group => ({
    ...group,
    members: group.members.filter(item => item.id !== id)
  }))
}

const removeGroup = (groupIndex: string) => {
  groupNames.value = groupNames.value.filter((item, index) => index !== groupIndex)
}

const generateMembers = () => {
  const current = members.value
  const diff = totalMembers.value - current.length

  if (diff > 0) {
    // 增加人數
    for (let i = 0; i < diff; i++) {
      const id = current.length + i + 1
      const newMember: Member = {
        id,
        isLeader: false,
      }
      customFields.value.forEach(f => {
        newMember[f.keyName] = ''
      })
      current.push(newMember)
    }
  } else if (diff < 0) {
    // 減少人數：砍掉多餘
    members.value = current.slice(0, totalMembers.value)
  }
}

const groupCount = ref(3)
const groupNames = ref<string[]>([])
const groupColors = ref<string[]>([])
const groups = ref<Group[]>([])

const leaderCount = computed(() => members.value.filter(m => m.isLeader).length)

const toggleLeader = (id: number) => {
  const member = members.value.find(m => m.id === id)
  if (!member) return

  const currentlySelected = member.isLeader
  const totalLeaders = leaderCount.value

  if (!currentlySelected && totalLeaders >= groupCount.value) {
    alert('隊長人數不得超過分組數')
    return
  }

  member.isLeader = !member.isLeader

  const selected = members.value.filter(m => m.isLeader)
  if (selected.length > 0 && selected.length !== groupCount.value) {
    alert(`請指定 ${groupCount.value} 位隊長（目前為 ${selected.length} 位）`)
  }
}

const generateGroupMeta = () => {
  groupNames.value = Array.from({ length: groupCount.value }, (_, i) => `組別 ${i + 1}`)
  groupColors.value = Array.from({ length: groupCount.value }, () =>
    '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '137')
  )
}

const shuffle = <T>(array: T[]): T[] => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const validateLeaderAssignment = (groups: Group[]): boolean => {
  let allHaveOneLeader = true
  for (const group of groups) {
    const leaders = group.members.filter(m => m.isLeader)
    if (leaders.length > 1 || (leaderCount.value > 0 && leaders.length === 0)) {
      allHaveOneLeader = false
      break
    }
  }
  return allHaveOneLeader
}

const validLeaderNumber = () => {
  const usingLeader = leaderCount.value > 0
  if (leaderCount.value === 0) return true
  if (usingLeader && leaderCount.value !== groupCount.value) {
    if (leaderCount.value > groupCount.value ) {
      alert(`目前已勾選 ${leaderCount.value} 位隊長，已超過最分組上限，請移除 ${leaderCount.value - groupCount.value} 位隊長後再進行分組`)
    } else {
      alert(`目前已勾選 ${leaderCount.value} 位隊長，請指定 ${groupCount.value} 位隊長後再進行分組`)
    }
    return false
  } else {
    return usingLeader
  }
}

const tempGroups = ref<Group[]>()

const assignGroups = () => {
  const usingLeader = validLeaderNumber()
  if (!usingLeader) return

  let success = false
  let attempts = 0

  while (!success && attempts < 1000) {
    attempts++

    const leaders = members.value.filter(m => m.isLeader)
    const others = shuffle(members.value.filter(m => !m.isLeader))
    const all = shuffle([...leaders, ...others])

    tempGroups.value = Array.from({ length: groupCount.value }, (_, i) => ({
      id: i,
      name: groupNames.value[i] || `組別 ${i + 1}`,
      color: groupColors.value[i] || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      members: []
    }))

    all.forEach((member, index) => {
      const groupIndex = index % groupCount.value
      tempGroups.value[groupIndex].members.push(member)
    })

    if (!usingLeader || validateLeaderAssignment(tempGroups.value)) {
      groups.value = tempGroups.value
      success = true
    }
  }

  if (!success) {
    alert('無法在 1000 次內完成有效分組，請確認隊長設定是否合理')
  }
}

const clean = () => {
  members.value = [{  "id": 1, "isLeader": false }]
  customFields.value.forEach((item, index) => {
    members.value[0][item] = ""
  })
}

generateMembers()
generateGroupMeta()

watch(members, val => totalMembers.value = val.length)
watch(groupNames, val => groupCount.value = val.length)

members.value = [ 
  { "id": 1, "isLeader": true, "俠名": "笑天", "性別": "男", "門派": "神刀門" }, 
  { "id": 2, "isLeader": false, "俠名": "森冷", "性別": "男", "門派": "五毒教" }, 
  { "id": 3, "isLeader": false, "俠名": "夜柳", "性別": "男", "門派": "移花宮" }, 
  { "id": 4, "isLeader": true, "俠名": "借命", "性別": "男", "門派": "血衣樓" }, 
  { "id": 5, "isLeader": false, "俠名": "破酒", "性別": "男", "門派": "丐幫" }, 
  { "id": 6, "isLeader": false, "俠名": "藏夢", "性別": "女", "門派": "天香谷" }, 
  { "id": 7, "isLeader": true, "俠名": "霜烟", "性別": "女", "門派": "太白山" }, 
  { "id": 8, "isLeader": false, "俠名": "唐念", "性別": "女", "門派": "唐門" }, 
  { "id": 9, "isLeader": false, "俠名": "嗜心", "性別": "女", "門派": "玄武門" }, 
  { "id": 10, "isLeader": false, "俠名": "逆怨", "性別": "女", "門派": "萬血窟" },
  { "id": 11, "isLeader": false, "俠名": "雪飲 輕衣", "性別": "女", "門派": "雪衣樓" },
]

</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold">亂數分組工具</h1>

    <div class="grid gap-4 md:grid-cols-2">
      <div>
        <label class="font-semibold">總人數：</label>
        <input v-model.number="totalMembers" type="number" min="1" class="border p-1 w-24" @change="generateMembers" 
          placeholder="請輸入總人數"
        />
      </div>
      <div>
        <label class="font-semibold">分組數：</label>
        <input v-model.number="groupCount" type="number" min="1" class="border p-1 w-24" @change="generateGroupMeta" />
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-lg font-semibold">自訂欄位</h2>
      <div class="flex space-x-2 items-center">
        <input v-model="newField" placeholder="新增欄位名稱" class="border p-1" />
        <button @click="addField" class="bg-green-600 text-white px-2 py-1 ml-2 rounded">新增欄位</button>
      </div>
      
      <div class="flex flex-wrap gap-2 mt-2">
        <div class="tag-title">欄位標頭</div>
        <span v-for="(field, index) in customFields" :key="index" class="inline-flex items-center bg-gray-200 px-2 py-1 ml-1 rounded">
          <input class="tag" v-model="customFields[index].keyName" />
          <button @click="removeField(field.keyName)" class="ml-1 text-red-500">&times;</button>
        </span>
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-lg font-semibold">分組名稱</h2>
      <div v-for="(name, index) in groupNames" :key="index" class="flex items-center space-x-2 mb-1">
        <input v-model="groupNames[index]" placeholder="分組名稱" class="border p-1 w-40" />
        <input v-model="groupColors[index]" type="color" class="w-10 h-10" />
        <button @click="removeGroup(index)" class="ml-1 text-red-500">&times;</button>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold">成員設定</h2>
      <table class="w-full border text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th v-for="(item, index) in customFields" :key="index">{{ item.keyName }}</th>
            <th>隊長</th>
            <th>刪除</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td>{{ member.id }}</td>
            <td v-for="(item, index) in customFields" :key="index">
              <input class="memberInput"
               v-model="member[item.keyName]" :placeholder="item.keyName" />
            </td>
            <td>
              <span class="m-show">隊長(選填)</span>
              <input type="checkbox" v-model="member.isLeader" />
            </td>
            <td>
              <button class="ml-1 text-red-500" @click="removeMember(member.id)">&times;</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" @click="assignGroups">
        開始亂數分組
      </button>
      <button class="ml-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" @click="clean">消除成員資料</button>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      <div
        v-for="group in groups"
        :key="group?.id || 0"
        class="group-item border rounded shadow"
        :style="{ backgroundColor: group?.color + '33' }"
      >
        <h3 class="text-lg font-bold mb-2" :style="{ color: group?.color }">{{ group?.name }}</h3>
        <ul class="group-list ml-4 text-m">
          <li v-for="member in group?.members" :key="member.id">
            {{ member[customFields[0].keyName] || '未命名' }} 
            <template v-if="customFields.length > 1">
              (<span v-for="(item, index) in customFields.slice(1)">
                {{ member[item.keyName] }}
                <template v-if="index !== customFields.length-2">、</template>
              </span>)
            </template>
            <span v-if="member.isLeader">（隊長）</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>


<style scoped>
:root {
  --border-color: #ddd;
  --bg-header: #f5f5f5;
  --hover-color: #f0f8ff;
  --leader-highlight: #fffbe6;
}

/* 基本排版 */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1, h2, h3 {
  margin: 0.5em 0;
}

label {
  display: inline-block;
  margin-bottom: 4px;
  font-weight: 600;
}

/* 表單與輸入欄位 */
input[type="text"],
input[type="number"],
input[type="color"] {
  padding: 4px 8px;
  font-size: 14px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  /* width: 100%; */
  box-sizing: border-box;
  margin-left: 10px;
  cursor: pointer;
}

input[type="number"] {
  max-width: 100px;
  border: 1px solid #d5d5d5;
  margin-bottom: 5px;
}

input[type="checkbox"] {
  transform: scale(1.1);
}

button {
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
  margin-top: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #0056b3;
}

/* 表格樣式 */
table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 1em;
}

th,
td {
  border: 1px solid var(--border-color);
  padding: 6px 10px;
  text-align: left;
  vertical-align: middle;
}

th {
  background-color: var(--bg-header);
  font-weight: 600;
}

tr:hover {
  background-color: var(--hover-color);
}

/* 分組結果卡片 */
.group-card {
  border: 1px solid var(--border-color);
  padding: 12px;
  border-radius: 6px;
  margin-top: 1em;
  background-color: #fff;
  box-shadow: 1px 1px 4px rgba(0,0,0,0.05);
}

.group-card h3 {
  margin-bottom: 0.5em;
  font-size: 16px;
}

.group-card ul {
  margin-left: 1.2em;
  padding-left: 0;
  list-style-type: disc;
}

.group-card li {
  margin-bottom: 4px;
  font-size: 14px;
}

.group-card .leader {
  background-color: var(--leader-highlight);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  font-size: 12px;
  font-weight: bold;
}

.group-list {
  padding: 0 40px 15px;
}

.group-item {
  padding: 1px 10px 0;
  margin-top: 10px;
}

.ml-1 {
  margin-left: 5px;
}
.ml-2 {
  margin-left: 10px;
}
.mb-1 {
  margin-bottom: 5px;
}
.mb-2 {
  margin-bottom: 10px;
}
.mb-3 {
  margin-bottom: 25px;
}
.mt-2 {
  margin-top: 10px;
}
.text-m {
  font-size: 16px;
}

.tag-title {
  margin-bottom: 0;
  font-weight: 700;
}
.tag {
  border: 1px solid #007bff;
  border-radius: 4px;
  padding: 3px;
  color: #0963c3;
  font-size: 18px;
}
.memberInput {
  border: 1px solid #7e7e7e;
  border-radius: 4px;
  padding: 3px;
  color: #131313;
  font-size: 16px;
}
.m-show {
  display: none;
}

/* -------- RWD 響應式樣式 -------- */

/* 格線區塊：分為兩欄、三欄 */
.grid-2col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.grid-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

/* 響應式斷點 */
@media screen and (max-width: 768px) {
  .grid-2col,
  .grid-3col {
    grid-template-columns: 1fr;
  }

  table thead {
    display: none;
  }

  table tr {
    display: block;
    margin-bottom: 1em;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 8px;
    background-color: #fff;
  }

  table td {
    display: flex;
    /* justify-content: space-between; */
    justify-content: end;
    padding: 6px 8px;
    border: none;
    border-bottom: 1px solid #eee;
  }

  table td:last-child {
    border-bottom: none;
  }

  table td::before {
    content: attr(data-label);
    font-weight: bold;
    margin-right: 8px;
    color: #555;
  }
  .m-show {
    display: block;
  }
}


</style>
