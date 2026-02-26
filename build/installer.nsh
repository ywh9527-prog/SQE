!macro customHeader
  !system "echo 'SQE质量管理系统安装程序'"
!macroend

!macro customInstall
  ; 创建数据目录
  CreateDirectory "$APPDATA\sqe-quality-management-system\data\database"
  CreateDirectory "$APPDATA\sqe-quality-management-system\data\uploads"
!macroend
