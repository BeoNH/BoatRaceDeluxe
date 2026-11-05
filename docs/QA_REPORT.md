STATUS: PASS

Co so: khong co FAIL blocker/major; network runtime PASS (chi localhost); tsc 0 loi; check_no_external 0 hit (Opus chay lai sau khi sua).
Sau QA da sua 2 bug minor: (1) tile LOCKED hien lai so mo, (2) race Sfx.startMusic (BGSound khong phat neu pointer den truoc khi Res.load xong). Hai sua nay moi qua tsc, CHUA chay lai QA runtime; user da nghe duoc nhac nen trong editor truoc khi sua. Bug "tile 9 khong vao game" 1 lan, khong tai hien (nghi may tai nang).
Muc chua kiem: xem cuoi file (touch that tren mobile, xoay man hinh, nghe am thanh that).
Phuong phap: Playwright headless Chromium (khong phai MCP editor; user yeu cau chot som), doc `sim` qua `cc.director` de canh thoi diem, bam bang chuot that (mouse.down/up), KHONG teleport. Level 4-10 mo bang localStorage `currentLevel:10` (init script), roi van choi that.

## Ket qua
1. Luong: PASS. Intro->Play->LevelSelect (chi L1 mo, 2-10 LOCKED)->GamePlay->LevelUp->Next; Menu->ConfirmPopUp Yes->Intro / No->resume; thua->LevelFailed->Retry / Main Menu; thang L10->WinScreen->Main Menu->Intro; LevelSelect Main Menu->Intro; bam tile LOCKED khong vao. Layout khop spec §4 va screenshot goc (menu/select/play) - xem docs/qa/select_l1.jpg, play_l1.jpg, confirm.jpg, failed.jpg, levelup.jpg, win.jpg.
2. Gameplay that: PASS. Thang that L1(10 shot), L2(8), L3(10), L4-L10 deu thang bang pointer that (planner tren mask, khong teleport). Thua tu nhien (dung yen): L1 sau ~35s, L10 sau ~62s. Do: tick 24.4/s; arrow +-64 buoc 4; power bar buoc 0.04 [0.1..1], vi tri bar y=ship.y+50; power 54 -> di dung 54px, buoc/tick 1.7,5,8.5,11.8,11.8,8.5,5,1.7 (ease in-out, frms=8 dung cong thuc). Va cham: thuyen lui 1 buoc (planner gap va cham van thang). Khoi tao L4,6,9,10 dung (init_L*.png).
3. Save: PASS. Reload giu currentLevel/scores; 6 kieu du lieu hong (garbage, null, [], sai kieu, currentLevel 99/-5) khong crash, ve mac dinh/clamp; mo khoa dung. Diem khop cong thuc: L1 1330 (3 wp chua di x110), L2 1360, L4 1420, L7 1340, L8 1900. currentLevel len 11 sau L10 (dung spec §5.6).
4. Sound: PASS co dieu kien. sfx/music toggle luu `sfxOn/musicOn`, giu qua reload; music tat -> volume 0 (van playing); RunShip phat dung 1 lan/shot (hook playOneShot). Autoplay bi chan (flag document-user-activation): khong loi console. Headless khong nghe duoc nhac - khong xac nhan chat luong am thanh.
   - MINOR (nghi van): sau lan cham dau (bam Play) 3s sau AudioSource BGSound van `clip=None, playing=false` (t16); chi thay playing=true sau cac tuong tac sau. Spec §4.1 phat nhac ngay sau lan cham dau. Chua xac dinh do load tre hay logic.
5. HUD/pause/resize: PASS. Bam sfx/music/menu khong ban thuyen; popup pause dung AI+sim (vi tri AI khong doi) va click nen/panel khong ban. Preview "Full Screen" 16:9, 4:3, portrait 420x845: letterbox dung, click map dung (fs169.png, fsport_play.png). Luu y: che do "Design Resolution" cua preview khong scale (han che preview, khong phai bug).
6. Console/network: PASS. Khong error/pageerror/warning cua game; chi co "GL Driver Message ... ReadPixels" (Chromium/SwiftShader, khong phai game). Moi request (~563/phien) deu `localhost:7456`; khong co host ngoai.
7. Edge: PASS. Double-click Play/tile: khong mo 2 man. 8 lan restart lien tiep: so node 22 khong doi, tick van 24.5/s, khong nhan doi. Giu chuot -> ra ngoai canvas -> tha: ban binh thuong (pw~100). Double-tap: 1 shot, 1 sfx. Bam tile roi Menu ngay trong luc fade: popup mo binh thuong, khong loi.

## Bug
- [minor] LevelSelect: tile LOCKED mat so level (goc hien so mo sau overlay LOCKED; xem select.png goc vs select_l1.png). Spec §4.3 khong yeu cau ro; chi khac hinh.
- [minor] BGSound chua phat sau lan cham dau (muc 4).
- [flake chua tai hien] 1 lan chay (L9 trong t7) tu Play->tile9 khong vao GameScreen (`current.sim` null); chay lai 2 lan deu vao duoc. Co the do nhan chuot truoc khi man san sang khi may tai nang; can theo doi.

## Chua kiem
- Chua choi trong Game View editor (MCP) theo yeu cau chot som (muc Editor checklist 10).
- Chua chay `tsc.sh`, `check_no_external.py` (checklist 9) - chua chay.
- Chua kiem touch that tren mobile (chi mouse), mat focus tab, xoay man hinh.
- Chua do ease/va cham chi tiet tung level (chi L1 do so, L2-10 chi xac nhan thang).
- Audio thuc te (nghe) khong kiem duoc o headless.
