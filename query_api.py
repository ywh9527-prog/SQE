import sqlite3

db_path = r'D:\AI\Claude-SQE-Data-Analysis-Assistant-refactored\server\data\sqe_database.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print('=== 模拟 API 查询：/api/evaluations/accumulated/2025?type=purchase ===')
print()

# Step 1: 查询 status = 'completed' 的评价
print('Step 1: 查询 status = completed 的评价')
cursor.execute("""
SELECT id, period_name, start_date, end_date, status
FROM performance_evaluations
WHERE status = 'completed'
  AND start_date >= '2025-01-01'
  AND start_date < '2026-01-01'
""")
completed_evals = cursor.fetchall()
print(f'找到 {len(completed_evals)} 个 completed 评价:')
for row in completed_evals:
    print(f'  ID:{row[0]} {row[1]} | {row[2]}~{row[3]}')

# Step 2: 查询这些评价的详情
print()
print('Step 2: 查询这些评价的详情 (data_type=purchase)')
cursor.execute("""
SELECT ped.id, ped.evaluation_entity_name, ped.data_type, ped.total_score
FROM performance_evaluation_details ped
WHERE ped.evaluation_id IN (SELECT id FROM performance_evaluations WHERE status = 'completed')
  AND ped.data_type = 'purchase'
""")
details = cursor.fetchall()
print(f'找到 {len(details)} 条详情记录')

# Step 3: 计算 totalEntities (唯一供应商数量)
print()
print('Step 3: 计算 totalEntities (唯一供应商数量)')
cursor.execute("""
SELECT COUNT(DISTINCT ped.evaluation_entity_name) as unique_count
FROM performance_evaluation_details ped
WHERE ped.evaluation_id IN (SELECT id FROM performance_evaluations WHERE status = 'completed')
  AND ped.data_type = 'purchase'
""")
result = cursor.fetchone()
print(f'API 应该返回的 totalEntities = {result[0]}')

# Step 4: 如果为 0，检查所有供应商
print()
print('Step 4: 检查是否有任何供应商数据')
cursor.execute("""
SELECT COUNT(DISTINCT ped.evaluation_entity_name) as unique_count
FROM performance_evaluation_details ped
WHERE ped.data_type = 'purchase'
""")
all_vendors = cursor.fetchone()[0]
print(f'数据库中所有 purchase 类型供应商 = {all_vendors}')

conn.close()

print()
print('=' * 60)
print('结论:')
if result[0] == 0:
    print('❌ API 查询结果 totalEntities = 0')
    print('   可能原因: completed 评价中没有 purchase 类型的详情')
else:
    print(f'✓ API 查询结果 totalEntities = {result[0]}')
