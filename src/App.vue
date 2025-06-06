<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'

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
  { keyIndex: 0, keyName: 'name' },
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

const groupCount = ref(1)
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

const initDefaultGroup = () => {
  groupNames.value = Array.from({ length: groupCount.value }, (_, i) => `組別 ${i + 1}`)
  groupColors.value = Array.from({ length: groupCount.value }, () => randomGroupColor())
}


const randomGroupColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '137')
}

const addMember = () => {
  totalMembers.value += 1
  generateMembers()
}

const addGroup = () => {
  groupCount.value += 1
  groupNames.value.push(`組別 ${groupNames.value.length + 1}`)
  groupColors.value.push(randomGroupColor())
  console.log('groupColors', groupColors.value)
}

const clean = () => {
  if (!confirm("確定全部刪除")) {
    return;
  }
  members.value = []
  // members.value = [{ "id": 1, "isLeader": false }]
  // customFields.value.forEach((item, index) => {
  //   members.value[0][item] = ""
  // })
}

const shuffle = <T>(array: T[]): T[] => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const scrollIntoViewBlock = (id = '') => {
  nextTick(() => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  })
}

// 驗證欄位
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

const validMembers = () => {
  return members.value.length && members.value.some(item => item[customFields.value[0].keyName])
}
const validGroups = () => {
  return groupNames.value.length && (members.value.length >= groupNames.value.length )
}

// 執行分組功能相關
const tempGroups = ref<Group[]>()
const assignGroups = () => {
  const isValidGroups = validGroups()
  if (!isValidGroups) {
    alert('成員人數必須大於組數')
    return
  }
  const isValidMembers = validMembers()
  if (!isValidMembers) {
    alert('仍有成員必填欄位未填寫')
    return
  }
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

  scrollIntoViewBlock('source_id')
}

// 測試資料相關
const queryTest = ref<string>('')
const getQuery = () => {
  const UrlSearch = location.search
  queryTest.value = UrlSearch.split('=')[1]
}

const addTestData = () => {
  switch (queryTest.value) {
    case '1':
      customFields.value = [
        { keyIndex: 0, keyName: '姓名' }
      ]

      groupNames.value = ['1車', '2車', '3車', '4車', '5車', '6車', '7車', '8車']

      members.value = [ 
        { "id": 1, "isLeader": true, "姓名": "岳" }, 
        { "id": 1, "isLeader": false, "姓名": "鐙" }, 
        { "id": 1, "isLeader": false, "姓名": "潔" }, 
        { "id": 1, "isLeader": false, "姓名": "甄" }, 

        { "id": 1, "isLeader": false, "姓名": "念" }, 
        { "id": 1, "isLeader": false, "姓名": "家" }, 
        { "id": 1, "isLeader": false, "姓名": "惠" }, 
        { "id": 1, "isLeader": false, "姓名": "婷" }, 

        { "id": 1, "isLeader": false, "姓名": "昆" }, 
        { "id": 1, "isLeader": false, "姓名": "游" }, 
        { "id": 1, "isLeader": false, "姓名": "七" }, 
        { "id": 1, "isLeader": false, "姓名": "掃" }, 

        { "id": 1, "isLeader": false, "姓名": "鐙1" }, 
        { "id": 1, "isLeader": false, "姓名": "鐙2" }, 
        { "id": 1, "isLeader": false, "姓名": "潔3" }, 
        { "id": 1, "isLeader": false, "姓名": "潔4" }, 

        { "id": 1, "isLeader": false, "姓名": "甄5" }, 
        { "id": 1, "isLeader": false, "姓名": "甄6" }, 
        { "id": 1, "isLeader": false, "姓名": "甄7" }, 
        { "id": 1, "isLeader": false, "姓名": "念8" }, 

        { "id": 1, "isLeader": false, "姓名": "家9" }, 
        { "id": 1, "isLeader": false, "姓名": "惠10" }, 
        { "id": 1, "isLeader": false, "姓名": "昆11" }, 

        { "id": 1, "isLeader": true, "姓名": "鏢1" },
        { "id": 1, "isLeader": true, "姓名": "鏢2" },
        { "id": 1, "isLeader": true, "姓名": "鏢3" },
        { "id": 1, "isLeader": true, "姓名": "鏢4" },
        { "id": 1, "isLeader": true, "姓名": "鏢5" },
        { "id": 1, "isLeader": true, "姓名": "鏢6" },
        { "id": 1, "isLeader": true, "姓名": "鏢7" },

        { "id": 1, "isLeader": false, "姓名": "褓" },
        { "id": 1, "isLeader": false, "姓名": "褓2" },
        { "id": 1, "isLeader": false, "姓名": "褓3" },
        { "id": 1, "isLeader": false, "姓名": "助" },
      ]
      break;
  
    default:
      customFields.value = [
        { keyIndex: 0, keyName: '俠名' },
        { keyIndex: 1, keyName: '性別' },
        { keyIndex: 2, keyName: '門派' },
      ]

      groupNames.value = ['先鋒組', '側翼組', '斬首組']

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
      break;
  }
  if (groupNames.value.length) {
    groupColors.value = groupNames.value.map((item, index) => {
      return randomGroupColor()
    })
  }
}

// init data
generateMembers()
initDefaultGroup()

onMounted(() => {
  getQuery()
})

watch(members, val => totalMembers.value = val.length)
watch(groupNames, val => groupCount.value = val.length)

</script>

<template>
  <main class="">
    <h1 class="">亂數分組工具</h1>

    <section class="section-col mb-1">
      <h2 class="h2-panel">分組設定</h2>
      <div class="section-row">
        <div class="flex-col">
          <label class="">總人數：</label>
          <input v-model.number="totalMembers" type="number" min="1" class="generalInput" @change="generateMembers" 
            placeholder="請輸入總人數"
          />
        </div>
        <div class="flex-col">
          <label class="">分組數：</label>
          <input v-model.number="groupCount" type="number" min="1" class="generalInput" @change="initDefaultGroup" />
        </div>
      </div>
      <div class="btn-area">
        <button class="test-btn" @click="addTestData">加入測試假資料</button>
      </div>
    </section>

    <section class="">
      <h2 class="h2-panel">自訂欄位</h2>
      <div class="">
        <input v-model="newField" placeholder="新增欄位名稱" class="generalInput" />
        <button @click="addField" class="ml-2">新增欄位 +</button>
      </div>
      
      <div class="">
        <div class="tag-title">欄位標頭</div>
        <span v-for="(field, index) in customFields" :key="index" class="">
          <input class="generalInput" v-model="customFields[index].keyName" />
          <button @click="removeField(field.keyName)" class="ml-1 mr-1 ">&times;</button>
        </span>
      </div>
    </section>

    <section class="">
      <h2 class="h2-panel">
        分組名稱
        <button class="ml-3" @click="addGroup">增加組別 +</button>
      </h2>
      <div v-for="(name, index) in groupNames" :key="index" class="labal-area">
        <input v-model="groupNames[index]" placeholder="分組名稱" class="generalInput" />
        <input v-model="groupColors[index]" type="color" class="w-10 h-10" />
        <button @click="removeGroup(index)" class="ml-1">&times;</button>
      </div>
    </section>

    <section>
      <h2 class="h2-panel">
        成員設定
        <button class="ml-3" @click="addMember">增加人數 +</button>
      </h2>
      <table class="">
        <thead>
          <tr>
            <th>ID</th>
            <th v-for="(item, index) in customFields" :key="index">{{ item.keyName }}</th>
            <th>隊長</th>
            <th>
              <span class="tag current-pointer" @click="clean">刪除</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(member, memberIndex) in members" :key="memberIndex">
            <td>{{ member.id }}</td>
            <td v-for="(item, index) in customFields" :key="index">
              <input class="generalInput"
               v-model="member[item.keyName]" 
               :placeholder="`${item.keyName} ${(index === 0)? '(必填)': ''}`" 
              />
            </td>
            <td class="td-align-items-center">
              <input type="checkbox" v-model="member.isLeader" />
              <span class="m-show size-16 ">隊長(選填)</span>
            </td>
            <td class="td-align-items-center">
              <button class="remove-btn" @click="removeMember(member.id)">&times;</button>
              <span class="m-show size-16 ">刪除</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="" id="source_id">
      <h2 v-if="groups.length">分組結果</h2>
      <div
        v-for="group in groups"
        :key="group?.id || 0"
        class="group-item"
        :style="{ backgroundColor: group?.color + '33' }"
      >
        <h3 class="mb-2" :style="{ color: group?.color }">{{ group?.name }}</h3>
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
    </section>
  </main>
  <div class="start-area">
    <div class="start-wrap">
      <button class="start-btn" @click="assignGroups">
        開始亂數分組
      </button>
    </div>
  </div>
</template>
<style scoped>
body {
  font-family: 'Helvetica Neue', sans-serif;
  background-color: #f5f6f8;
  color: #333;
  font-size: 15px;
  padding: 1rem;
  line-height: 1.5;
}

h1 {
  font-size: 1.5rem;
  font-weight: bold;
  /* margin-bottom: 2rem; */
}
.h2-panel {
  font-size: 1.5rem;
  font-weight: 600;
  /* border-left: 4px solid #2563eb; */
  /* padding-left: 0.5rem; */
  margin-bottom: 1rem;
  /* margin-top: 2rem; */
}

input.generalInput {
  padding: 0 .5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  min-width: 300px;
  font-size: 0.95rem;
  margin: 0.25rem 0;
  height: 38px;
}

main {
  width: 768px;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  margin-bottom: 4rem;
}

.section-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}
.section-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.flex-row {
  display: flex;
  flex-direction: row;
}
.flex-col {
  display: flex;
  flex-direction: column;
}

button {
  background-color: #2563eb;
  color: white;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  padding: 0.4rem 1rem;
  height: 38px;
}

button:hover {
  background-color: #1e40af;
}

.ml-1 {
  margin-left: 0.5rem;
}
.ml-2 {
  margin-left: 0.75rem;
}
.ml-3 {
  margin-left: 1rem;
}
.mr-1 {
  margin-right: 0.5rem;
}
.mr-2 {
  margin-right: 0.75rem;
}
.mr-3 {
  margin-right: 1rem;
}
.mt-1 {
  margin-top: 0.5rem;
}
.mt-2 {
  margin-top: 0.5rem;
}
.mt-3 {
  margin-top: 1rem;
}
.mb-1 {
  margin-bottom: 0.5rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-3 {
  margin-bottom: 1rem;
}

.size-16 {
  font-size: 16px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}

table th,
table td {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  font-size: 0.9rem;
  text-align: left;
}

td {
  vertical-align: middle;
  padding: 0.5rem;
  height: 48px; /* 建議加上這行固定高度 */
}

table th {
  background-color: #f3f4f6;
  font-weight: 600;
}

.tag-title {
  margin-top: 0.5rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.tag {
  padding: 0.35rem 0.6rem;
  background-color: #ffffff;
  border-radius: 5px;
  margin-right: 0.25rem;
  border: 1px solid #ccc;
}

.group-item {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.group-item h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.group-list {
  list-style-type: disc;
  padding-left: 1.25rem;
}

.current-pointer {
  cursor: pointer;
  color: #dc2626;
  font-weight: bold;
}

input[type="color"] {
  border: none;
  background: transparent;
  width: 38px;
  height: 44px;
  padding: 0;
  margin-left: 0.5rem;
  margin-bottom: 4px;
  vertical-align: middle;
}

.m-show {
  display: block;
}

.align-items-center {
  align-items: center;
}

.remove-btn {
  margin-right: 5px;
}
.test-btn {
  width: auto;
}

.start-btn {
  width: 96%;
  padding: 1.1rem 1rem;
  height: auto;
  font-size: 1.1rem;
  transform: translate(-8px, 0);
}

.start-area {
  position: fixed;
  bottom: 0;
  background: #FFF;
  width: 100%;
}
.start-wrap {
  width: 768px;
  display: flex;
  justify-content: center;
  margin: 0 auto;
}

/* 非M版時呈現 */
@media (min-width: 768px) {
  main {
    width: 1024px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.25rem;
  }

  .generalInput {
    width: auto;
  }
  .m-show {
    display: none;
  }
  .remove-btn {
    margin-right: 0;
  }
  .start-area {
    bottom: 0vh;
  }
  .start-btn {
    width: 100%;
  }
  .start-wrap {
    width: 1024px;
  }
}

.td-align-items-center {
  text-align: center!important;
}

/* M版時呈現 */
@media (max-width: 768px) {
  table,
  thead,
  tbody,
  th,
  td,
  tr {
    display: block;
    /* width: 100%; */
  }

  thead tr {
    display: none;
  }

  tbody tr {
    margin-bottom: 1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    background-color: #fff;
    padding: 0.5rem;
  }

  tbody td {
    padding: 0.5rem;
    border: none;
    position: relative;
    display: flex;
  }

  tbody td::before {
    content: attr(data-label);
    font-weight: bold;
    display: block;
    margin-bottom: 0.25rem;
  }
  .td-align-items-center {
    display: flex;
    align-items: center;
  }
}

</style>
