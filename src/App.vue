<script setup lang="ts">
import { ref, computed } from 'vue'

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

const totalMembers = ref(4)
const members = ref<Member[]>([])

const MAX_FIELDS = 11
const customFields = ref<string[]>(['name', 'job'])
const newField = ref('')

const addField = () => {
  const field = newField.value.trim()
  if (!field) return
  if (customFields.value.length >= MAX_FIELDS) {
    alert(`欄位數量已達上限（${MAX_FIELDS}個）`)
    return
  }
  if (!customFields.value.includes(field)) {
    customFields.value.push(field)
    members.value.forEach(m => {
      m[field] = ''
    })
  }
  newField.value = ''
}

const removeField = (field: string) => {
  if (['id', 'isLeader'].includes(field)) return
  customFields.value = customFields.value.filter(f => f !== field)
  members.value.forEach(m => {
    delete m[field]
  })
}

const generateMembers = () => {
  members.value = Array.from({ length: totalMembers.value }, (_, i) => {
    const member: Member = {
      id: i + 1,
      isLeader: false
    }
    customFields.value.forEach(f => member[f] = '')
    return member
  })
}

const groupCount = ref(2)
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

  // 若有勾選任何一名隊長，則必須勾滿對應組數
  const selected = members.value.filter(m => m.isLeader)
  if (selected.length > 0 && selected.length !== groupCount.value) {
    alert(`請指定 ${groupCount.value} 位隊長（目前為 ${selected.length} 位）`)
  }
}

const generateGroupMeta = () => {
  groupNames.value = Array.from({ length: groupCount.value }, (_, i) => `組別 ${i + 1}`)
  groupColors.value = Array.from({ length: groupCount.value }, () =>
    '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
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

// 驗證隊長數量
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

const assignGroups = () => {
  // 不使用隊長功能時跳過驗證
  const usingLeader = validLeaderNumber()
  if (!usingLeader) return

  let success = false
  let attempts = 0

  while (!success && attempts < 1000) {
    attempts++

    const leaders = members.value.filter(m => m.isLeader)
    const others = shuffle(members.value.filter(m => !m.isLeader))
    const all = shuffle([...leaders, ...others])

    const tempGroups: Group[] = Array.from({ length: groupCount.value }, (_, i) => ({
      id: i,
      name: groupNames.value[i] || `組別 ${i + 1}`,
      color: groupColors.value[i] || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      members: []
    }))

    all.forEach((member, index) => {
      const groupIndex = index % groupCount.value
      tempGroups[groupIndex].members.push({ ...member })
    })

    if (!usingLeader || validateLeaderAssignment(tempGroups)) {
      groups.value = tempGroups
      success = true
    }
  }

  if (!success) {
    alert('無法在 1000 次內完成有效分組，請確認隊長設定是否合理')
  }
}

// 初始化
generateMembers()
generateGroupMeta()
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
        <span v-for="field in customFields" :key="field" class="inline-flex items-center bg-gray-200 px-2 py-1 ml-1 rounded">
          <span class="tag">{{ field }}</span>
          <button @click="removeField(field)" class="ml-1 text-red-500">&times;</button>
        </span>
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-lg font-semibold">分組名稱與顏色</h2>
      <div v-for="(name, index) in groupNames" :key="index" class="flex items-center space-x-2 mb-1">
        <input v-model="groupNames[index]" placeholder="分組名稱" class="border p-1 w-40" />
        <input v-model="groupColors[index]" type="color" class="w-10 h-10" />
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold">成員設定</h2>
      <table class="w-full border text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th v-for="(keyName, keyIndex) in customFields" :key="keyIndex">{{ keyName }}</th>
            <th>隊長</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td>{{ member.id }}</td>
            <td v-for="field in customFields" :key="field">
              <input v-model="member[field]" :placeholder="field" />
            </td>
            <td><input type="checkbox" v-model="member.isLeader" @change="validLeaderNumber"/></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" @click="assignGroups">
        開始亂數分組
      </button>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      <div
        v-for="group in groups"
        :key="group.id"
        class="p-4 border rounded shadow"
        :style="{ backgroundColor: group.color + '33' }"
      >
        <h3 class="text-lg font-bold mb-2" :style="{ color: group.color }">{{ group.name }}</h3>
        <ul class="list-disc ml-4 text-sm">
          <li v-for="member in group.members" :key="member.id">
            {{ member.name || '未命名' }} <span v-if="member.isLeader">（隊長）</span>
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

.tag-title {
  margin-bottom: 0;
  font-weight: 700;
}
.tag {
  border: 1px solid #007bff;
  border-radius: 4px;
  padding: 1px 3px 3px 3px;
  color: #0963c3;
  font-size: 18px;
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
    justify-content: space-between;
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
}


</style>
