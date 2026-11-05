// =============================================================================
// FIGMA PLUGIN SCRIPT: CHUẨN HÓA MÔ HÌNH SÁCH 4 CẤP (CLOUDBOOKSTORE / COMICPOS)
// Mô hình: Bộ sách ➔ Đầu sách ➔ Ấn bản ➔ Bản sách vật lý
// =============================================================================
// Cách sử dụng trong Figma:
// 1. Mở file Figma của bạn (Page 1)
// 2. Mở Plugin "Scripter" hoặc vào menu: Plugins > Development > New Plugin
//    (hoặc mở DevTools Console: Ctrl + Alt + I / Cmd + Option + I)
// 3. Dán toàn bộ mã dưới đây và chạy (Run)
// =============================================================================

(async () => {
  // 1. Tải Font hệ thống Inter
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const page = figma.currentPage;

  // Helper Màu sắc
  const colors = {
    bgApp: { r: 0.96, g: 0.97, b: 0.98 },      // #f5f7fa
    white: { r: 1, g: 1, b: 1 },
    border: { r: 0.91, g: 0.93, b: 0.95 },     // #e8ecf2
    primary: { r: 0.31, g: 0.27, b: 0.90 },    // #4f46e5 (Indigo)
    primaryLight: { r: 0.93, g: 0.95, b: 1 }, // #eef2ff
    textDark: { r: 0.09, g: 0.14, b: 0.22 },   // #182337
    textMuted: { r: 0.47, g: 0.51, b: 0.58 },  // #778295
    success: { r: 0.09, g: 0.63, b: 0.52 },    // #16a34a (Green)
    successLight: { r: 0.94, g: 0.99, b: 0.95 },
    warning: { r: 0.85, g: 0.47, b: 0.02 },    // #d97706 (Amber)
    warningLight: { r: 1, g: 0.98, b: 0.92 },
    danger: { r: 0.88, g: 0.26, b: 0.26 },     // #dc2626 (Red)
    dangerLight: { r: 1, g: 0.95, b: 0.95 },
    purple: { r: 0.55, g: 0.20, b: 0.90 },
    purpleLight: { r: 0.96, g: 0.93, b: 1 },
  };

  // Helper tạo Text
  function createText(str, size = 12, weight = "Regular", color = colors.textDark) {
    const text = figma.createText();
    text.fontName = { family: "Inter", style: weight };
    text.fontSize = size;
    text.characters = str;
    text.fills = [{ type: "SOLID", color: color }];
    return text;
  }

  // Helper tạo Badge
  function createBadge(label, bg, textColor, borderCol = null) {
    const frame = figma.createFrame();
    frame.layoutMode = "HORIZONTAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.paddingLeft = 8;
    frame.paddingRight = 8;
    frame.paddingTop = 4;
    frame.paddingBottom = 4;
    frame.cornerRadius = 6;
    frame.fills = [{ type: "SOLID", color: bg }];
    if (borderCol) {
      frame.strokes = [{ type: "SOLID", color: borderCol }];
      frame.strokeWeight = 1;
    }
    frame.appendChild(createText(label, 11, "Medium", textColor));
    return frame;
  }

  // ===========================================================================
  // MÀN HÌNH 1: SCR-INV-10 · Quản lý Bộ sách & Ma trận tập (MỚI TOANH)
  // ===========================================================================
  const screenSeries = figma.createFrame();
  screenSeries.name = "SCR-INV-10 · Quản lý Bộ sách & Tiến độ đủ bộ";
  screenSeries.resize(1440, 1200);
  screenSeries.fills = [{ type: "SOLID", color: colors.bgApp }];
  screenSeries.layoutMode = "HORIZONTAL";
  screenSeries.x = 2960;
  screenSeries.y = 6262;

  // 1.1. Sidebar mô phỏng
  const sidebar1 = figma.createFrame();
  sidebar1.name = "Thanh điều hướng";
  sidebar1.resize(224, 1200);
  sidebar1.fills = [{ type: "SOLID", color: colors.white }];
  sidebar1.strokes = [{ type: "SOLID", color: colors.border }];
  sidebar1.strokeRightWeight = 1;
  sidebar1.layoutMode = "VERTICAL";
  sidebar1.paddingLeft = 18;
  sidebar1.paddingRight = 18;
  sidebar1.paddingTop = 30;
  sidebar1.itemSpacing = 20;

  const logoBox = figma.createFrame();
  logoBox.layoutMode = "HORIZONTAL";
  logoBox.itemSpacing = 10;
  logoBox.fills = [];
  const logoIcon = figma.createFrame();
  logoIcon.resize(32, 34);
  logoIcon.cornerRadius = 8;
  logoIcon.fills = [{ type: "SOLID", color: colors.primary }];
  const logoText = figma.createFrame();
  logoText.layoutMode = "VERTICAL";
  logoText.fills = [];
  logoText.appendChild(createText("ComicPOS", 16, "Semi Bold", colors.textDark));
  logoText.appendChild(createText("OLD BOOKS · NEW STORIES", 8, "Regular", colors.textMuted));
  logoBox.appendChild(logoIcon);
  logoBox.appendChild(logoText);
  sidebar1.appendChild(logoBox);

  // Menu items
  const menuTitles = [
    { name: "Tổng quan", active: false },
    { name: "Quầy giao dịch", active: false },
    { name: "Bộ sách (Series)", active: true },
    { name: "Danh mục đầu sách", active: false },
    { name: "Nhập / Xuất kho", active: false },
    { name: "Kiểm kê kho", active: false },
    { name: "Khách hàng", active: false },
    { name: "Báo cáo & Thuế", active: false },
    { name: "Cấu hình hệ thống", active: false }
  ];
  menuTitles.forEach(m => {
    const item = figma.createFrame();
    item.layoutMode = "HORIZONTAL";
    item.resize(188, 40);
    item.paddingLeft = 12;
    item.paddingRight = 12;
    item.cornerRadius = 8;
    item.primaryAxisAlignItems = "MIN";
    item.counterAxisAlignItems = "CENTER";
    if (m.active) {
      item.fills = [{ type: "SOLID", color: colors.primaryLight }];
      item.appendChild(createText(m.name, 12, "Semi Bold", colors.primary));
    } else {
      item.fills = [];
      item.appendChild(createText(m.name, 12, "Regular", colors.textMuted));
    }
    sidebar1.appendChild(item);
  });
  screenSeries.appendChild(sidebar1);

  // 1.2. Main Content Quản lý Bộ sách
  const mainContent1 = figma.createFrame();
  mainContent1.name = "Nội dung Quản lý Bộ sách";
  mainContent1.layoutMode = "VERTICAL";
  mainContent1.layoutGrow = 1;
  mainContent1.paddingLeft = 32;
  mainContent1.paddingRight = 32;
  mainContent1.paddingTop = 28;
  mainContent1.itemSpacing = 24;
  mainContent1.fills = [];

  // Header Title
  const headerRow = figma.createFrame();
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.layoutAlign = "STRETCH";
  headerRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  headerRow.counterAxisAlignItems = "CENTER";
  headerRow.fills = [];

  const titleGroup = figma.createFrame();
  titleGroup.layoutMode = "VERTICAL";
  titleGroup.itemSpacing = 4;
  titleGroup.fills = [];
  titleGroup.appendChild(createText("Quản lý Bộ sách & Tiến độ đủ bộ (Series / Boxset)", 20, "Bold", colors.textDark));
  titleGroup.appendChild(createText("Theo dõi ma trận tập, mức độ hoàn thiện của từng bộ truyện và hỗ trợ đóng gói bán/thuê trọn bộ.", 12, "Regular", colors.textMuted));
  headerRow.appendChild(titleGroup);

  const newSeriesBtn = figma.createFrame();
  newSeriesBtn.layoutMode = "HORIZONTAL";
  newSeriesBtn.paddingLeft = 16;
  newSeriesBtn.paddingRight = 16;
  newSeriesBtn.paddingTop = 10;
  newSeriesBtn.paddingBottom = 10;
  newSeriesBtn.cornerRadius = 8;
  newSeriesBtn.fills = [{ type: "SOLID", color: colors.primary }];
  newSeriesBtn.appendChild(createText("+ Tạo Bộ sách mới", 13, "Semi Bold", colors.white));
  headerRow.appendChild(newSeriesBtn);
  mainContent1.appendChild(headerRow);

  // KPI Row
  const kpiRow = figma.createFrame();
  kpiRow.layoutMode = "HORIZONTAL";
  kpiRow.layoutAlign = "STRETCH";
  kpiRow.itemSpacing = 16;
  kpiRow.fills = [];

  const kpis = [
    { title: "Tổng số Bộ sách", val: "286", sub: "Manga, Comic, Tiểu thuyết", col: colors.primary },
    { title: "Tỷ lệ đủ bộ trung bình", val: "78.4%", sub: "Đủ điều kiện cho thuê trọn bộ", col: colors.success },
    { title: "Bộ đã hoàn thiện 100%", val: "64", sub: "Đủ bộ sẵn sàng bán combo", col: colors.purple },
    { title: "Bộ khuyết tập cần săn", val: "18", sub: "Ưu tiên thu mua từ khách", col: colors.danger }
  ];
  kpis.forEach(k => {
    const card = figma.createFrame();
    card.layoutMode = "VERTICAL";
    card.layoutGrow = 1;
    card.paddingLeft = 18;
    card.paddingRight = 18;
    card.paddingTop = 16;
    card.paddingBottom = 16;
    card.cornerRadius = 10;
    card.fills = [{ type: "SOLID", color: colors.white }];
    card.strokes = [{ type: "SOLID", color: colors.border }];
    card.strokeWeight = 1;
    card.itemSpacing = 6;
    card.appendChild(createText(k.title, 11, "Medium", colors.textMuted));
    card.appendChild(createText(k.val, 22, "Bold", k.col));
    card.appendChild(createText(k.sub, 10, "Regular", colors.textMuted));
    kpiRow.appendChild(card);
  });
  mainContent1.appendChild(kpiRow);

  // Series Detail & Matrix Card
  const seriesCard = figma.createFrame();
  seriesCard.name = "Chi tiết Bộ truyện & Ma trận tập";
  seriesCard.layoutMode = "VERTICAL";
  seriesCard.layoutAlign = "STRETCH";
  seriesCard.paddingLeft = 24;
  seriesCard.paddingRight = 24;
  seriesCard.paddingTop = 20;
  seriesCard.paddingBottom = 24;
  seriesCard.cornerRadius = 12;
  seriesCard.fills = [{ type: "SOLID", color: colors.white }];
  seriesCard.strokes = [{ type: "SOLID", color: colors.border }];
  seriesCard.strokeWeight = 1;
  seriesCard.itemSpacing = 16;

  // Series Header Info
  const shRow = figma.createFrame();
  shRow.layoutMode = "HORIZONTAL";
  shRow.layoutAlign = "STRETCH";
  shRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  shRow.counterAxisAlignItems = "CENTER";
  shRow.fills = [];

  const shLeft = figma.createFrame();
  shLeft.layoutMode = "HORIZONTAL";
  shLeft.itemSpacing = 16;
  shLeft.counterAxisAlignItems = "CENTER";
  shLeft.fills = [];

  const shBadge = createBadge("BỘ TRUYỆN TRANH", colors.purpleLight, colors.purple);
  shLeft.appendChild(shBadge);
  shLeft.appendChild(createText("Thám tử lừng danh Conan (Case Closed)", 16, "Bold", colors.textDark));
  shLeft.appendChild(createText("· Tác giả: Gosho Aoyama · NXB Kim Đồng · Đang phát hành", 12, "Regular", colors.textMuted));
  shRow.appendChild(shLeft);

  const shActions = figma.createFrame();
  shActions.layoutMode = "HORIZONTAL";
  shActions.itemSpacing = 10;
  shActions.fills = [];

  const btnCombo = figma.createFrame();
  btnCombo.layoutMode = "HORIZONTAL";
  btnCombo.paddingLeft = 12;
  btnCombo.paddingRight = 12;
  btnCombo.paddingTop = 8;
  btnCombo.paddingBottom = 8;
  btnCombo.cornerRadius = 6;
  btnCombo.fills = [{ type: "SOLID", color: colors.successLight }];
  btnCombo.strokes = [{ type: "SOLID", color: colors.success }];
  btnCombo.strokeWeight = 1;
  btnCombo.appendChild(createText("✓ Đóng gói Combo Bán Full Set", 12, "Semi Bold", colors.success));
  shActions.appendChild(btnCombo);

  const btnHunt = figma.createFrame();
  btnHunt.layoutMode = "HORIZONTAL";
  btnHunt.paddingLeft = 12;
  btnHunt.paddingRight = 12;
  btnHunt.paddingTop = 8;
  btnHunt.paddingBottom = 8;
  btnHunt.cornerRadius = 6;
  btnHunt.fills = [{ type: "SOLID", color: colors.dangerLight }];
  btnHunt.strokes = [{ type: "SOLID", color: colors.danger }];
  btnHunt.strokeWeight = 1;
  btnHunt.appendChild(createText("⚠ Xuất danh sách 8 tập khuyết để thu mua", 12, "Semi Bold", colors.danger));
  shActions.appendChild(btnHunt);

  shRow.appendChild(shActions);
  seriesCard.appendChild(shRow);

  // Completeness Bar
  const progBox = figma.createFrame();
  progBox.layoutMode = "VERTICAL";
  progBox.layoutAlign = "STRETCH";
  progBox.itemSpacing = 6;
  progBox.fills = [];

  const progLabelRow = figma.createFrame();
  progLabelRow.layoutMode = "HORIZONTAL";
  progLabelRow.layoutAlign = "STRETCH";
  progLabelRow.primaryAxisAlignItems = "SPACE_BETWEEN";
  progLabelRow.fills = [];
  progLabelRow.appendChild(createText("Tiến độ bộ truyện: Đã có 96 / 104 tập (Khuyết: Tập 12, 18, 45, 67, 88, 92, 99, 103)", 12, "Medium", colors.textDark));
  progLabelRow.appendChild(createText("92.3% Hoàn thiện", 12, "Bold", colors.primary));
  progBox.appendChild(progLabelRow);

  const barBg = figma.createFrame();
  barBg.layoutAlign = "STRETCH";
  barBg.resize(1136, 10);
  barBg.cornerRadius = 5;
  barBg.fills = [{ type: "SOLID", color: colors.border }];
  const barFill = figma.createFrame();
  barFill.resize(1048, 10);
  barFill.cornerRadius = 5;
  barFill.fills = [{ type: "SOLID", color: colors.primary }];
  barBg.appendChild(barFill);
  progBox.appendChild(barBg);
  seriesCard.appendChild(progBox);

  // Volume Matrix Grid Legend
  const legendRow = figma.createFrame();
  legendRow.layoutMode = "HORIZONTAL";
  legendRow.itemSpacing = 20;
  legendRow.counterAxisAlignItems = "CENTER";
  legendRow.fills = [];
  legendRow.appendChild(createText("Ma trận 104 tập:", 12, "Semi Bold", colors.textDark));
  legendRow.appendChild(createBadge("■ Sẵn sàng (>=2 cuốn)", colors.successLight, colors.success));
  legendRow.appendChild(createBadge("■ Sắp hết (1 cuốn)", colors.warningLight, colors.warning));
  legendRow.appendChild(createBadge("■ Hết hàng (0 cuốn)", colors.dangerLight, colors.danger));
  legendRow.appendChild(createBadge("□ Chưa từng có trong kho", colors.border, colors.textMuted));
  seriesCard.appendChild(legendRow);

  // Volume Matrix Items (Mô phỏng 40 tập đầu tiên)
  const matrixGrid = figma.createFrame();
  matrixGrid.layoutMode = "HORIZONTAL";
  matrixGrid.layoutWrap = "WRAP";
  matrixGrid.layoutAlign = "STRETCH";
  matrixGrid.itemSpacing = 8;
  matrixGrid.counterAxisSpacing = 8;
  matrixGrid.fills = [];

  const missingVols = [12, 18, 45, 67, 88, 92, 99, 103];
  const lowVols = [3, 7, 10, 24, 31, 38];

  for (let v = 1; v <= 40; v++) {
    const volPill = figma.createFrame();
    volPill.layoutMode = "VERTICAL";
    volPill.resize(52, 42);
    volPill.cornerRadius = 6;
    volPill.primaryAxisAlignItems = "CENTER";
    volPill.counterAxisAlignItems = "CENTER";
    volPill.itemSpacing = 2;

    if (missingVols.includes(v)) {
      volPill.fills = [{ type: "SOLID", color: colors.dangerLight }];
      volPill.strokes = [{ type: "SOLID", color: colors.danger }];
      volPill.strokeWeight = 1;
      volPill.appendChild(createText(`T.${v < 10 ? '0' + v : v}`, 11, "Bold", colors.danger));
      volPill.appendChild(createText("0 bản", 9, "Regular", colors.danger));
    } else if (lowVols.includes(v)) {
      volPill.fills = [{ type: "SOLID", color: colors.warningLight }];
      volPill.strokes = [{ type: "SOLID", color: colors.warning }];
      volPill.strokeWeight = 1;
      volPill.appendChild(createText(`T.${v < 10 ? '0' + v : v}`, 11, "Bold", colors.warning));
      volPill.appendChild(createText("1 bản", 9, "Regular", colors.warning));
    } else {
      volPill.fills = [{ type: "SOLID", color: colors.successLight }];
      volPill.strokes = [{ type: "SOLID", color: colors.success }];
      volPill.strokeWeight = 1;
      volPill.appendChild(createText(`T.${v < 10 ? '0' + v : v}`, 11, "Bold", colors.success));
      volPill.appendChild(createText("4 bản", 9, "Regular", colors.success));
    }
    matrixGrid.appendChild(volPill);
  }
  seriesCard.appendChild(matrixGrid);
  mainContent1.appendChild(seriesCard);
  screenSeries.appendChild(mainContent1);


  // ===========================================================================
  // MÀN HÌNH 2: TÁI CẤU TRÚC SCR-INV-03 (MASTER-DETAIL 3 TẦNG: Title -> Edition -> Copies)
  // ===========================================================================
  const screenDetail = figma.createFrame();
  screenDetail.name = "SCR-INV-03 · Chi tiết Đầu sách, Ấn bản & Bản vật lý (REDESIGNED)";
  screenDetail.resize(1440, 1400);
  screenDetail.fills = [{ type: "SOLID", color: colors.bgApp }];
  screenDetail.layoutMode = "HORIZONTAL";
  screenDetail.x = 5040;
  screenDetail.y = 6262;

  // Sidebar cho SCR-INV-03
  const sidebar2 = sidebar1.clone();
  screenDetail.appendChild(sidebar2);

  // Main Content SCR-INV-03
  const mainContent2 = figma.createFrame();
  mainContent2.name = "Không gian chi tiết 3 cấp";
  mainContent2.layoutMode = "VERTICAL";
  mainContent2.layoutGrow = 1;
  mainContent2.paddingLeft = 32;
  mainContent2.paddingRight = 32;
  mainContent2.paddingTop = 28;
  mainContent2.itemSpacing = 20;
  mainContent2.fills = [];

  // Breadcrumb
  const breadcrumb = figma.createFrame();
  breadcrumb.layoutMode = "HORIZONTAL";
  breadcrumb.itemSpacing = 6;
  breadcrumb.counterAxisAlignItems = "CENTER";
  breadcrumb.fills = [];
  breadcrumb.appendChild(createText("Kho sách", 12, "Regular", colors.textMuted));
  breadcrumb.appendChild(createText("/", 12, "Regular", colors.textMuted));
  breadcrumb.appendChild(createText("Bộ: Thám tử lừng danh Conan", 12, "Medium", colors.purple));
  breadcrumb.appendChild(createText("/", 12, "Regular", colors.textMuted));
  breadcrumb.appendChild(createText("Đầu sách: Conan · Tập 10", 12, "Semi Bold", colors.textDark));
  mainContent2.appendChild(breadcrumb);

  // -------------------------------------------------------------------------
  // BLOCK 1: CẤP ĐẦU SÁCH / TÁC PHẨM (TITLE LEVEL)
  // -------------------------------------------------------------------------
  const titleCard = figma.createFrame();
  titleCard.name = "Cấp 2: Đầu sách / Tác phẩm";
  titleCard.layoutMode = "VERTICAL";
  titleCard.layoutAlign = "STRETCH";
  titleCard.paddingLeft = 24;
  titleCard.paddingRight = 24;
  titleCard.paddingTop = 18;
  titleCard.paddingBottom = 20;
  titleCard.cornerRadius = 12;
  titleCard.fills = [{ type: "SOLID", color: colors.white }];
  titleCard.strokes = [{ type: "SOLID", color: colors.border }];
  titleCard.strokeWeight = 1;
  titleCard.itemSpacing = 12;

  const tcTop = figma.createFrame();
  tcTop.layoutMode = "HORIZONTAL";
  tcTop.layoutAlign = "STRETCH";
  tcTop.primaryAxisAlignItems = "SPACE_BETWEEN";
  tcTop.counterAxisAlignItems = "CENTER";
  tcTop.fills = [];

  const tcTitleGroup = figma.createFrame();
  tcTitleGroup.layoutMode = "HORIZONTAL";
  tcTitleGroup.itemSpacing = 12;
  tcTitleGroup.counterAxisAlignItems = "CENTER";
  tcTitleGroup.fills = [];
  tcTitleGroup.appendChild(createText("Conan · Tập 10", 20, "Bold", colors.textDark));
  tcTitleGroup.appendChild(createBadge("Tập 10 / 104", colors.primaryLight, colors.primary));
  tcTitleGroup.appendChild(createBadge("Đang kinh doanh", colors.successLight, colors.success));
  tcTop.appendChild(tcTitleGroup);

  const tcActions = figma.createFrame();
  tcActions.layoutMode = "HORIZONTAL";
  tcActions.itemSpacing = 10;
  tcActions.fills = [];
  const btnEditTitle = figma.createFrame();
  btnEditTitle.paddingLeft = 12;
  btnEditTitle.paddingRight = 12;
  btnEditTitle.paddingTop = 6;
  btnEditTitle.paddingBottom = 6;
  btnEditTitle.cornerRadius = 6;
  btnEditTitle.fills = [{ type: "SOLID", color: colors.border }];
  btnEditTitle.appendChild(createText("Sửa tác phẩm", 12, "Medium", colors.textDark));
  tcActions.appendChild(btnEditTitle);
  tcTop.appendChild(tcActions);
  titleCard.appendChild(tcTop);

  const tcMeta = figma.createFrame();
  tcMeta.layoutMode = "HORIZONTAL";
  tcMeta.itemSpacing = 28;
  tcMeta.fills = [];
  tcMeta.appendChild(createText("Tác giả: Gosho Aoyama", 12, "Regular", colors.textMuted));
  tcMeta.appendChild(createText("Thể loại: Manga · Trinh thám", 12, "Regular", colors.textMuted));
  tcMeta.appendChild(createText("Năm công bố gốc: 1996", 12, "Regular", colors.textMuted));
  tcMeta.appendChild(createText("Thuộc bộ: Thám tử lừng danh Conan ↗", 12, "Medium", colors.purple));
  titleCard.appendChild(tcMeta);
  mainContent2.appendChild(titleCard);

  // -------------------------------------------------------------------------
  // BLOCK 2: CẤP ẤN BẢN (EDITION LEVEL SELECTOR)
  // -------------------------------------------------------------------------
  const editionSection = figma.createFrame();
  editionSection.name = "Cấp 3: Danh sách Ấn bản";
  editionSection.layoutMode = "VERTICAL";
  editionSection.layoutAlign = "STRETCH";
  editionSection.itemSpacing = 12;
  editionSection.fills = [];

  const edHeader = figma.createFrame();
  edHeader.layoutMode = "HORIZONTAL";
  edHeader.layoutAlign = "STRETCH";
  edHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
  edHeader.counterAxisAlignItems = "CENTER";
  edHeader.fills = [];
  edHeader.appendChild(createText("Các Ấn bản xuất bản (2 ấn bản đã đăng ký):", 14, "Bold", colors.textDark));

  const addEdBtn = figma.createFrame();
  addEdBtn.layoutMode = "HORIZONTAL";
  addEdBtn.paddingLeft = 12;
  addEdBtn.paddingRight = 12;
  addEdBtn.paddingTop = 6;
  addEdBtn.paddingBottom = 6;
  addEdBtn.cornerRadius = 6;
  addEdBtn.fills = [{ type: "SOLID", color: colors.primaryLight }];
  addEdBtn.appendChild(createText("+ Thêm Ấn bản mới bằng ISBN", 12, "Semi Bold", colors.primary));
  edHeader.appendChild(addEdBtn);
  editionSection.appendChild(edHeader);

  // Danh sách Thẻ Ấn Bản (Cards)
  const edCardsRow = figma.createFrame();
  edCardsRow.layoutMode = "HORIZONTAL";
  edCardsRow.layoutAlign = "STRETCH";
  edCardsRow.itemSpacing = 16;
  edCardsRow.fills = [];

  // Card 1 (ĐANG CHỌN)
  const edCard1 = figma.createFrame();
  edCard1.layoutMode = "VERTICAL";
  edCard1.layoutGrow = 1;
  edCard1.paddingLeft = 18;
  edCard1.paddingRight = 18;
  edCard1.paddingTop = 16;
  edCard1.paddingBottom = 16;
  edCard1.cornerRadius = 10;
  edCard1.fills = [{ type: "SOLID", color: colors.white }];
  edCard1.strokes = [{ type: "SOLID", color: colors.primary }];
  edCard1.strokeWeight = 2; // Viền đậm đang chọn
  edCard1.itemSpacing = 10;

  const edC1Top = figma.createFrame();
  edC1Top.layoutMode = "HORIZONTAL";
  edC1Top.primaryAxisAlignItems = "SPACE_BETWEEN";
  edC1Top.layoutAlign = "STRETCH";
  edC1Top.counterAxisAlignItems = "CENTER";
  edC1Top.fills = [];
  edC1Top.appendChild(createBadge("ẤN BẢN ĐANG CHỌN", colors.primary, colors.white));
  edC1Top.appendChild(createText("Tồn: 8 bản vật lý", 11, "Bold", colors.success));
  edCard1.appendChild(edC1Top);

  edCard1.appendChild(createText("NXB Kim Đồng · Tái bản 2024 (Bìa mềm áo rời)", 14, "Bold", colors.textDark));

  const edC1Specs = figma.createFrame();
  edC1Specs.layoutMode = "VERTICAL";
  edC1Specs.itemSpacing = 4;
  edC1Specs.fills = [];
  edC1Specs.appendChild(createText("• ISBN-13: 978-604-2-09359-5 (EAN-13 chuẩn)", 11, "Regular", colors.textDark));
  edC1Specs.appendChild(createText("• Giá bìa tham chiếu: 45.000đ · Thuê: 3.000đ/ngày", 11, "Semi Bold", colors.primary));
  edC1Specs.appendChild(createText("• Định mức tồn min: 2 bán / 3 thuê · 184 trang · Tiếng Việt", 11, "Regular", colors.textMuted));
  edCard1.appendChild(edC1Specs);
  edCardsRow.appendChild(edCard1);

  // Card 2 (Không chọn)
  const edCard2 = figma.createFrame();
  edCard2.layoutMode = "VERTICAL";
  edCard2.layoutGrow = 1;
  edCard2.paddingLeft = 18;
  edCard2.paddingRight = 18;
  edCard2.paddingTop = 16;
  edCard2.paddingBottom = 16;
  edCard2.cornerRadius = 10;
  edCard2.fills = [{ type: "SOLID", color: colors.white }];
  edCard2.strokes = [{ type: "SOLID", color: colors.border }];
  edCard2.strokeWeight = 1;
  edCard2.itemSpacing = 10;

  const edC2Top = figma.createFrame();
  edC2Top.layoutMode = "HORIZONTAL";
  edC2Top.primaryAxisAlignItems = "SPACE_BETWEEN";
  edC2Top.layoutAlign = "STRETCH";
  edC2Top.counterAxisAlignItems = "CENTER";
  edC2Top.fills = [];
  edC2Top.appendChild(createBadge("BẢN ĐẶC BIỆT", colors.purpleLight, colors.purple));
  edC2Top.appendChild(createText("Tồn: 2 bản vật lý", 11, "Bold", colors.textMuted));
  edCard2.appendChild(edC2Top);

  edCard2.appendChild(createText("NXB Kim Đồng · Kỷ niệm 20 năm (Bìa cứng Jacket)", 14, "Bold", colors.textDark));

  const edC2Specs = figma.createFrame();
  edC2Specs.layoutMode = "VERTICAL";
  edC2Specs.itemSpacing = 4;
  edC2Specs.fills = [];
  edC2Specs.appendChild(createText("• ISBN-13: 978-604-2-19882-1", 11, "Regular", colors.textDark));
  edC2Specs.appendChild(createText("• Giá bìa: 120.000đ · Kênh: Chỉ bán (Không cho thuê)", 11, "Semi Bold", colors.purple));
  edC2Specs.appendChild(createText("• Định mức tồn min: 1 bán / 0 thuê · Kèm Artbook mini", 11, "Regular", colors.textMuted));
  edCard2.appendChild(edC2Specs);
  edCardsRow.appendChild(edCard2);

  editionSection.appendChild(edCardsRow);
  mainContent2.appendChild(editionSection);

  // -------------------------------------------------------------------------
  // BLOCK 3: CẤP BẢN SÁCH VẬT LÝ (PHYSICAL COPY LEVEL TABLE)
  // -------------------------------------------------------------------------
  const copySection = figma.createFrame();
  copySection.name = "Cấp 4: Bảng Bản sách vật lý";
  copySection.layoutMode = "VERTICAL";
  copySection.layoutAlign = "STRETCH";
  copySection.paddingLeft = 24;
  copySection.paddingRight = 24;
  copySection.paddingTop = 18;
  copySection.paddingBottom = 24;
  copySection.cornerRadius = 12;
  copySection.fills = [{ type: "SOLID", color: colors.white }];
  copySection.strokes = [{ type: "SOLID", color: colors.border }];
  copySection.strokeWeight = 1;
  copySection.itemSpacing = 14;

  const csHeader = figma.createFrame();
  csHeader.layoutMode = "HORIZONTAL";
  csHeader.layoutAlign = "STRETCH";
  csHeader.primaryAxisAlignItems = "SPACE_BETWEEN";
  csHeader.counterAxisAlignItems = "CENTER";
  csHeader.fills = [];

  const csHLeft = figma.createFrame();
  csHLeft.layoutMode = "HORIZONTAL";
  csHLeft.itemSpacing = 10;
  csHLeft.counterAxisAlignItems = "CENTER";
  csHLeft.fills = [];
  csHLeft.appendChild(createText("Bản sách vật lý của Ấn bản KĐ 2024 (8 cuốn trong kho)", 14, "Bold", colors.textDark));
  csHLeft.appendChild(createBadge("Cọc thuê = 100% Giá bán", colors.primaryLight, colors.primary));
  csHeader.appendChild(csHLeft);

  const csActions = figma.createFrame();
  csActions.layoutMode = "HORIZONTAL";
  csActions.itemSpacing = 10;
  csActions.fills = [];

  const btnPrintBarcodes = figma.createFrame();
  btnPrintBarcodes.paddingLeft = 12;
  btnPrintBarcodes.paddingRight = 12;
  btnPrintBarcodes.paddingTop = 6;
  btnPrintBarcodes.paddingBottom = 6;
  btnPrintBarcodes.cornerRadius = 6;
  btnPrintBarcodes.fills = [{ type: "SOLID", color: colors.white }];
  btnPrintBarcodes.strokes = [{ type: "SOLID", color: colors.border }];
  btnPrintBarcodes.strokeWeight = 1;
  btnPrintBarcodes.appendChild(createText("🖨 In Barcode các bản đã chọn", 12, "Medium", colors.textDark));
  csActions.appendChild(btnPrintBarcodes);

  const btnAddCopy = figma.createFrame();
  btnAddCopy.paddingLeft = 14;
  btnAddCopy.paddingRight = 14;
  btnAddCopy.paddingTop = 6;
  btnAddCopy.paddingBottom = 6;
  btnAddCopy.cornerRadius = 6;
  btnAddCopy.fills = [{ type: "SOLID", color: colors.primary }];
  btnAddCopy.appendChild(createText("+ Thêm cuốn vật lý", 12, "Semi Bold", colors.white));
  csActions.appendChild(btnAddCopy);

  csHeader.appendChild(csActions);
  copySection.appendChild(csHeader);

  // Table Columns Header
  const thRow = figma.createFrame();
  thRow.layoutMode = "HORIZONTAL";
  thRow.layoutAlign = "STRETCH";
  thRow.paddingTop = 8;
  thRow.paddingBottom = 8;
  thRow.fills = [{ type: "SOLID", color: colors.bgApp }];
  thRow.cornerRadius = 6;

  const thLabels = [
    { title: "CopyBarcode", w: 140 },
    { title: "Nguồn nhập", w: 150 },
    { title: "Tình trạng (Grade)", w: 180 },
    { title: "Giá vốn", w: 100 },
    { title: "Giá bán (Cọc)", w: 120 },
    { title: "Thuê / ngày", w: 110 },
    { title: "Vị trí kệ", w: 100 },
    { title: "Trạng thái", w: 140 }
  ];
  thLabels.forEach(th => {
    const col = figma.createFrame();
    col.resize(th.w, 20);
    col.fills = [];
    col.appendChild(createText(th.title, 11, "Semi Bold", colors.textMuted));
    thRow.appendChild(col);
  });
  copySection.appendChild(thRow);

  // Table Sample Rows
  const sampleRows = [
    { bc: "BC-0082918", src: "INB-20261010-001 (NCC)", grade: "A · Mới 99%, đủ bìa", cost: "25.000đ", sell: "45.000đ", rent: "3.000đ", shelf: "A1-03", st: "Khả dụng", stBg: colors.successLight, stCol: colors.success },
    { bc: "BC-0082919", src: "BUY-20261011-003 (Thu mua)", grade: "B · Ố nhẹ mép dưới", cost: "18.000đ", sell: "35.000đ", rent: "2.000đ", shelf: "A1-03", st: "Đang cho thuê", stBg: colors.primaryLight, stCol: colors.primary },
    { bc: "BC-0082921", src: "BUY-20261012-002 (Thu mua)", grade: "B · Đủ bìa áo", cost: "18.000đ", sell: "35.000đ", rent: "2.000đ", shelf: "A1-03", st: "Đang khóa kiểm kê", stBg: colors.warningLight, stCol: colors.warning },
    { bc: "BC-0082922", src: "BUY-20261001-001 (Thu mua)", grade: "D · Rách bìa gáy", cost: "10.000đ", sell: "15.000đ", rent: "1.000đ", shelf: "Kho hủy", st: "Hư hỏng", stBg: colors.dangerLight, stCol: colors.danger }
  ];

  sampleRows.forEach(r => {
    const tr = figma.createFrame();
    tr.layoutMode = "HORIZONTAL";
    tr.layoutAlign = "STRETCH";
    tr.paddingTop = 10;
    tr.paddingBottom = 10;
    tr.counterAxisAlignItems = "CENTER";
    tr.fills = [];
    tr.strokes = [{ type: "SOLID", color: colors.border }];
    tr.strokeBottomWeight = 1;

    // Col 1: Barcode
    const c1 = figma.createFrame();
    c1.resize(140, 20);
    c1.fills = [];
    c1.appendChild(createText(r.bc, 12, "Semi Bold", colors.primary));
    tr.appendChild(c1);

    // Col 2: Nguồn
    const c2 = figma.createFrame();
    c2.resize(150, 20);
    c2.fills = [];
    c2.appendChild(createText(r.src, 11, "Regular", colors.textDark));
    tr.appendChild(c2);

    // Col 3: Grade
    const c3 = figma.createFrame();
    c3.resize(180, 20);
    c3.fills = [];
    c3.appendChild(createText(r.grade, 11, "Regular", colors.textDark));
    tr.appendChild(c3);

    // Col 4: Cost
    const c4 = figma.createFrame();
    c4.resize(100, 20);
    c4.fills = [];
    c4.appendChild(createText(r.cost, 11, "Regular", colors.textMuted));
    tr.appendChild(c4);

    // Col 5: Sell
    const c5 = figma.createFrame();
    c5.resize(120, 20);
    c5.fills = [];
    c5.appendChild(createText(r.sell, 12, "Semi Bold", colors.textDark));
    tr.appendChild(c5);

    // Col 6: Rent
    const c6 = figma.createFrame();
    c6.resize(110, 20);
    c6.fills = [];
    c6.appendChild(createText(r.rent, 11, "Regular", colors.textDark));
    tr.appendChild(c6);

    // Col 7: Shelf
    const c7 = figma.createFrame();
    c7.resize(100, 20);
    c7.fills = [];
    c7.appendChild(createText(r.shelf, 11, "Medium", colors.textDark));
    tr.appendChild(c7);

    // Col 8: Status Badge
    const c8 = figma.createFrame();
    c8.resize(140, 24);
    c8.fills = [];
    c8.appendChild(createBadge(r.st, r.stBg, r.stCol));
    tr.appendChild(c8);

    copySection.appendChild(tr);
  });

  mainContent2.appendChild(copySection);
  screenDetail.appendChild(mainContent2);

  // Cuộn khung nhìn Figma tới 2 màn hình mới tạo
  figma.viewport.scrollAndZoomIntoView([screenSeries, screenDetail]);

  return {
    success: true,
    createdScreens: [
      { id: screenSeries.id, name: screenSeries.name },
      { id: screenDetail.id, name: screenDetail.name }
    ],
    message: "Đã tạo thành công 2 màn hình chuẩn hóa 4 cấp trên Figma canvas!"
  };
})();
