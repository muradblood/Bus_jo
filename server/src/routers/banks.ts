import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../trpc.js';
import { db, type Bank } from '../db.js';

type BankSeed = Omit<Bank, 'id' | 'createdAt' | 'updatedAt'>;

const walletKeys = new Set([
  'stcpay', 'urpay', 'alinmapay', 'mobily-pay', 'mobilypay', 'enjaz-wallet', 'barq',
  'tiqmo', 'friendipay', 'tweeq', 'neoleap', 'hala', 'sifi', 'darbpay', 'eandmoney',
  'pyypl', 'careempay', 'ipay', 'ooredoomoney', 'benefitpay', 'stcpay_bh', 'wise',
  'paypal', 'payoneer', 'skrill', 'neteller', 'zen', 'cashapp',
]);

function inferType(key: string, bins: string): Bank['type'] {
  return walletKeys.has(key.toLowerCase()) || !bins.trim() ? 'wallet' : 'bank';
}

function makeBank(
  key: string,
  name: string,
  nameEn: string,
  color: string,
  bins: string,
  options: Partial<BankSeed> = {},
): BankSeed {
  return {
    key,
    type: options.type ?? inferType(key, bins),
    name,
    nameEn,
    color,
    colorDark: options.colorDark ?? color,
    colorLight: options.colorLight ?? '#F5F5F5',
    otpMessage: options.otpMessage ?? `أدخل رمز التحقق المرسل إلى رقم جوالك المسجل لدى ${name}`,
    supportPhone: options.supportPhone ?? '',
    website: options.website ?? '',
    bins,
    logoUrl: options.logoUrl ?? '',
    enabled: options.enabled ?? true,
  };
}

const DEFAULT_BANKS: BankSeed[] = [
  // المملكة العربية السعودية
  makeBank('alrajhi', 'مصرف الراجحي', 'AL RAJHI BANK', '#0A2540', '409201, 422817, 428331, 429927, 431050, 445827, 457553, 484783, 506968, 588847', { colorDark: '#041121', colorLight: '#E8EEF5', supportPhone: '920003344', website: 'alrajhibank.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Al_Rajhi_Bank_Logo.svg' }),
  makeBank('snb', 'البنك الأهلي السعودي', 'SAUDI NATIONAL BANK', '#006A4E', '417336, 428671, 440647, 440795, 529415, 535825, 543085, 543357, 588845, 588846', { colorDark: '#004231', colorLight: '#E6F2EE', supportPhone: '920001000', website: 'alahli.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Saudi_National_Bank_logo.svg' }),
  makeBank('riyad', 'بنك الرياض', 'RIYAD BANK', '#2B3990', '407197, 407332, 457828, 458838, 521661, 524183, 532729, 589005', { colorDark: '#001B42', colorLight: '#E8EEF8', supportPhone: '920002470', website: 'riyadbank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Riyad_Bank_logo.svg' }),
  makeBank('alinma', 'مصرف الإنماء', 'ALINMA BANK', '#7A6855', '422817, 428671, 430268, 440533, 489818, 513213, 530908', { colorDark: '#453B30', colorLight: '#F4F1EE', supportPhone: '920028000', website: 'alinma.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Alinma_Bank_Logo.svg' }),
  makeBank('albilad', 'بنك البلاد', 'BANK ALBILAD', '#003366', '412565, 432328, 439088, 483011, 524183, 530060, 589206', { colorDark: '#001A38', colorLight: '#E6ECF5', supportPhone: '920001002', website: 'bankalbilad.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Bank_Albilad_logo.svg' }),
  makeBank('sab', 'البنك السعودي الأول', 'SAUDI AWWAL BANK', '#DB0011', '455036, 455708, 486094, 520058, 531095, 543085, 588850', { colorDark: '#80000A', colorLight: '#FCE8EA', supportPhone: '920007222', website: 'sab.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Saudi_Awwal_Bank_Logo.svg' }),
  makeBank('aljazira', 'بنك الجزيرة', 'BANK ALJAZIRA', '#005826', '420132, 440647, 440795, 524514, 554180', { colorDark: '#003316', colorLight: '#E6F0EA', supportPhone: '920006666', website: 'bankaljazira.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Bank_AlJazira_logo.svg' }),
  makeBank('bsf', 'البنك السعودي الفرنسي', 'BANQUE SAUDI FRANSI', '#002B49', '406136, 410621, 458456, 521661, 532013, 588848', { colorDark: '#001626', colorLight: '#E6EBF0', supportPhone: '920000576', website: 'alfransi.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Banque_Saudi_Fransi_logo.svg' }),
  makeBank('anb', 'البنك العربي الوطني', 'ARAB NATIONAL BANK', '#006039', '400138, 431361, 439818, 520058, 530011, 588849', { colorDark: '#003821', colorLight: '#E6F1EC', supportPhone: '920005555', website: 'anb.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Arab_National_Bank_logo.svg' }),
  makeBank('saib', 'البنك السعودي الاستثماري', 'THE SAUDI INVESTMENT BANK', '#1A4162', '420548, 420549, 458456, 512683, 524183, 588851', { colorDark: '#0E2538', colorLight: '#E8ECF0', supportPhone: '920001008', website: 'saib.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Saudi_Investment_Bank_logo.svg' }),
  makeBank('gib', 'بنك الخليج الدولي - ميم', 'GIB SAUDI / MEEM', '#F15A24', '506968, 521262, 588852', { colorDark: '#9C330D', colorLight: '#FEEEE9', supportPhone: '920026336', website: 'meem.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Gulf_International_Bank_Logo.svg' }),
  makeBank('stcbank', 'بنك اس تي سي', 'STC BANK', '#4F008C', '483011, 502220, 520230, 539922', { colorDark: '#2D0052', colorLight: '#F2E6FA', supportPhone: '920011444', website: 'stcbank.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/STC_Bank_logo.svg' }),
  makeBank('d360', 'بنك دي ٣٦٠', 'D360 BANK', '#00D285', '400000, 507803', { colorDark: '#006B44', colorLight: '#E6FAF3', supportPhone: '8001180008', website: 'd360.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/62/D360_Bank_logo.svg' }),
  makeBank('urpay', 'يور باي', 'URPAY', '#00A3E0', '410291, 521285, 532729', { colorDark: '#005C80', colorLight: '#E6F6FC', supportPhone: '8001000081', website: 'urpay.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Urpay_logo.svg' }),
  makeBank('mobilypay', 'موبايلي باي', 'MOBILY PAY', '#0099DA', '512683, 532729', { colorDark: '#00577D', colorLight: '#E6F5FC', supportPhone: '8001000880', website: 'mobilypay.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Mobily_Pay_logo.svg' }),
  makeBank('tiqmo', 'تيقمو', 'TIQMO', '#00E599', '516138, 539922', { colorDark: '#007A52', colorLight: '#E6FCF5', supportPhone: '8001240220', website: 'tiqmo.sc', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Tiqmo_logo.svg' }),
  makeBank('friendipay', 'فريندي باي', 'FRIENDI PAY', '#ED1C24', '512683, 535825', { colorDark: '#8A0F14', colorLight: '#FDE8E9', supportPhone: '920000184', website: 'friendipay.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Friendi_Pay_logo.svg' }),
  makeBank('tweeq', 'طويق', 'TWEEQ', '#6C5CE7', '516138, 539922', { colorDark: '#3B2E99', colorLight: '#EFEDFD', supportPhone: '8001240333', website: 'tweeq.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Tweeq_logo.svg' }),
  makeBank('neoleap', 'نيوليب', 'NEOLEAP', '#1E1B4B', '512683, 521285', { colorDark: '#0F0D29', colorLight: '#ECECF8', supportPhone: '8001241111', website: 'neoleap.com.sa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Neoleap_logo.svg' }),

  // الإمارات العربية المتحدة
  makeBank('enbd', 'بنك الإمارات دبي الوطني', 'EMIRATES NBD', '#002B49', '455364, 467744, 467745, 480926, 517715, 517723', { colorDark: '#001829', colorLight: '#E6EBF0', supportPhone: '+971600540000', website: 'emiratesnbd.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Emirates_NBD_logo.svg' }),
  makeBank('fab', 'بنك أبوظبي الأول', 'FIRST ABU DHABI BANK', '#1A1848', '402241, 431307, 458882, 520263, 531196, 543357', { colorDark: '#0B0A21', colorLight: '#E8E8EE', supportPhone: '+971600525555', website: 'bankfab.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/First_Abu_Dhabi_Bank_logo.svg' }),
  makeBank('adcb', 'بنك أبوظبي التجاري', 'ABU DHABI COMMERCIAL BANK', '#00263E', '404850, 412565, 413155, 417714, 515907, 532660', { colorDark: '#001421', colorLight: '#E6EAEF', supportPhone: '+971600502030', website: 'adcb.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Abu_Dhabi_Commercial_Bank_logo.svg' }),
  makeBank('mashreq', 'بنك المشرق', 'MASHREQ BANK', '#FF5F00', '402008, 415254, 432328, 521191, 528941', { colorDark: '#A33D00', colorLight: '#FFF0E6', supportPhone: '+97144244444', website: 'mashreqbank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Mashreq_Bank_logo.svg' }),
  makeBank('dib', 'بنك دبي الإسلامي', 'DUBAI ISLAMIC BANK', '#005B36', '406136, 428065, 450637, 521320, 540978', { colorDark: '#003620', colorLight: '#E6F0EC', supportPhone: '+97146092222', website: 'dib.ae', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Dubai_Islamic_Bank_logo.svg' }),
  makeBank('adib', 'بنك أبوظبي الإسلامي', 'ABU DHABI ISLAMIC BANK', '#005F9E', '402573, 418887, 431050, 520192, 532688', { colorDark: '#00385E', colorLight: '#E6EFF5', supportPhone: '+971600543216', website: 'adib.ae', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Abu_Dhabi_Islamic_Bank_logo.svg' }),
  makeBank('rakbank', 'بنك رأس الخيمة الوطني', 'RAKBANK', '#D81E05', '402000, 458882, 521661', { colorDark: '#851102', colorLight: '#FCE8E6', supportPhone: '+97142130000', website: 'rakbank.ae', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/RAKBANK_logo.svg' }),
  makeBank('cbd', 'بنك دبي التجاري', 'COMMERCIAL BANK OF DUBAI', '#003366', '402241, 412565, 532660', { colorDark: '#001F3F', colorLight: '#E6ECF2', supportPhone: '+971600575556', website: 'cbd.ae', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Commercial_Bank_of_Dubai_logo.svg' }),
  makeBank('sib', 'مصرف الشارقة الإسلامي', 'SHARJAH ISLAMIC BANK', '#184724', '406136, 520058', { colorDark: '#0D2914', colorLight: '#E8EFEA', supportPhone: '+97165999999', website: 'sib.ae', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Sharjah_Islamic_Bank_logo.svg' }),
  makeBank('ajmanbank', 'مصرف عجمان', 'AJMAN BANK', '#831C21', '431050, 520192', { colorDark: '#4A0F12', colorLight: '#F5E8E9', supportPhone: '+971600555522', website: 'ajmanbank.ae', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Ajman_Bank_logo.svg' }),
  makeBank('nbf', 'بنك الفجيرة الوطني', 'NATIONAL BANK OF FUJAIRAH', '#002B49', '404850, 521191', { colorDark: '#001729', colorLight: '#E6EBF0', supportPhone: '+9718008NBF', website: 'nbf.ae', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/National_Bank_of_Fujairah_logo.svg' }),
  makeBank('wio', 'بنك ويو', 'WIO BANK', '#000000', '520230, 539922, 552191', { colorDark: '#111111', colorLight: '#F0F0F0', supportPhone: '+971600500946', website: 'wio.io', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Wio_Bank_logo.svg' }),
  makeBank('liv', 'ليف الرقمي', 'LIV BY EMIRATES NBD', '#14F0B3', '467745, 517715', { colorDark: '#078261', colorLight: '#E6FEF8', supportPhone: '+971600540000', website: 'liv.me', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Liv_by_Emirates_NBD_logo.svg' }),
  makeBank('eandmoney', 'إي آند ماني', 'E& MONEY', '#E10A0A', '512683, 532729', { colorDark: '#850606', colorLight: '#FCEAEA', supportPhone: '+9718003927', website: 'eandmoney.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/E%26_Money_logo.svg' }),
  makeBank('pyypl', 'بايبول', 'PYYPL', '#6200EE', '539922, 552191', { colorDark: '#380088', colorLight: '#F0E6FE', supportPhone: '+97180079975', website: 'pyypl.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Pyypl_logo.png' }),
  makeBank('careempay', 'كريم باي', 'CAREEM PAY', '#000000', '532729, 539922', { colorDark: '#191919', colorLight: '#F2F2F2', supportPhone: '+97144400000', website: 'careem.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Careem_logo.svg' }),

  // دولة الكويت
  makeBank('nbk', 'بنك الكويت الوطني', 'NATIONAL BANK OF KUWAIT', '#002B49', '400138, 415254, 458838, 521191, 540978', { colorDark: '#001626', colorLight: '#E6EBF0', supportPhone: '+9651801801', website: 'nbk.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/National_Bank_of_Kuwait_logo.svg' }),
  makeBank('kfh', 'بيت التمويل الكويتي', 'KUWAIT FINANCE HOUSE', '#005F33', '406136, 428065, 450637, 520058, 530011', { colorDark: '#00381E', colorLight: '#E6F0EA', supportPhone: '+9651803333', website: 'kfh.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Kuwait_Finance_House_logo.svg' }),
  makeBank('boubyan', 'بنك بوبيان', 'BOUBYAN BANK', '#00539B', '402573, 418887, 431050, 520192', { colorDark: '#00315C', colorLight: '#E6EEF5', supportPhone: '+9651820082', website: 'bankboubyan.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Boubyan_Bank_logo.svg' }),
  makeBank('gulfbank', 'بنك الخليج', 'GULF BANK', '#ED1C24', '407197, 457828, 521661, 524183', { colorDark: '#8A0F14', colorLight: '#FDE8E9', supportPhone: '+9651805805', website: 'e-gulfbank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Gulf_Bank_Kuwait_logo.svg' }),
  makeBank('cbk_kw', 'البنك التجاري الكويتي', 'COMMERCIAL BANK OF KUWAIT', '#002855', '400000, 415254, 521191', { colorDark: '#00142B', colorLight: '#E6E9EF', supportPhone: '+9651888225', website: 'cbk.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Commercial_Bank_of_Kuwait_logo.svg' }),
  makeBank('abk', 'البنك الأهلي الكويتي', 'AL AHLI BANK OF KUWAIT', '#231F20', '407197, 521661', { colorDark: '#121011', colorLight: '#EAEAEA', supportPhone: '+9651899899', website: 'eahli.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Al_Ahli_Bank_of_Kuwait_logo.svg' }),
  makeBank('burgan', 'بنك برقان', 'BURGAN BANK', '#003D7C', '406136, 520058', { colorDark: '#00244A', colorLight: '#E6ECF2', supportPhone: '+9651804080', website: 'burgan.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Burgan_Bank_logo.svg' }),
  makeBank('warba', 'بنك وربة', 'WARBA BANK', '#00838F', '431050, 520192', { colorDark: '#004F57', colorLight: '#E6F3F4', supportPhone: '+9651825555', website: 'warbabank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Warba_Bank_logo.svg' }),
  makeBank('kib', 'بنك الكويت الدولي', 'KUWAIT INTERNATIONAL BANK', '#005826', '428065, 530011', { colorDark: '#003316', colorLight: '#E6F0EA', supportPhone: '+9651866866', website: 'kib.com.kw', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Kuwait_International_Bank_logo.svg' }),
  makeBank('weyay', 'بنك وياي', 'WEYAY BANK', '#6C5CE7', '516138, 539922', { colorDark: '#3B2E99', colorLight: '#EFEDFD', supportPhone: '+9651801801', website: 'weyaybank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Weyay_Bank_logo.svg' }),

  // دولة قطر
  makeBank('qnb', 'بنك قطر الوطني', 'QNB GROUP', '#6A1A24', '400000, 400138, 458838, 521191, 540978', { colorDark: '#3D0E14', colorLight: '#F2E8E9', supportPhone: '+97444407777', website: 'qnb.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/QNB_Group_logo.svg' }),
  makeBank('qib', 'مصرف قطر الإسلامي', 'QATAR ISLAMIC BANK', '#1A365D', '406136, 428065, 450637, 520058', { colorDark: '#0F2038', colorLight: '#E8ECF2', supportPhone: '+97444448444', website: 'qib.com.qa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Qatar_Islamic_Bank_logo.svg' }),
  makeBank('cbq', 'البنك التجاري القطري', 'COMMERCIAL BANK OF QATAR', '#002B49', '407197, 457828, 521661', { colorDark: '#001626', colorLight: '#E6EBF0', supportPhone: '+97444490000', website: 'cbq.qa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Commercial_Bank_of_Qatar_logo.svg' }),
  makeBank('dohabank', 'بنك الدوحة', 'DOHA BANK', '#005826', '400138, 521191', { colorDark: '#003316', colorLight: '#E6F0EA', supportPhone: '+97444456000', website: 'dohabank.com.qa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Doha_Bank_logo.svg' }),
  makeBank('dukhan', 'بنك دخان', 'DUKHAN BANK', '#781244', '428065, 520058', { colorDark: '#450A27', colorLight: '#F4E7ED', supportPhone: '+9748008555', website: 'dukhanbank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Dukhan_Bank_logo.svg' }),
  makeBank('alrayan', 'مصرف الريان', 'MASRAF AL RAYAN', '#002D62', '406136, 520058', { colorDark: '#001A38', colorLight: '#E6EBF0', supportPhone: '+97444253333', website: 'alrayan.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Masraf_Al_Rayan_logo.svg' }),
  makeBank('qiib', 'بنك قطر الدولي الإسلامي', 'QATAR INTERNATIONAL ISLAMIC BANK', '#005F33', '428065, 520058', { colorDark: '#00381E', colorLight: '#E6F0EA', supportPhone: '+97444840000', website: 'qiib.com.qa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/QIIB_logo.svg' }),
  makeBank('ipay', 'آي باي فودافون', 'IPAY QATAR', '#E60000', '512683, 532729', { colorDark: '#800000', colorLight: '#FCE6E6', supportPhone: '+9748007000', website: 'ipay.qa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Vodafone_icon.svg' }),
  makeBank('ooredoomoney', 'أوريدو ماني', 'OOREDOO MONEY', '#ED1C24', '512683, 532729', { colorDark: '#8A0F14', colorLight: '#FDE8E9', supportPhone: '+974111', website: 'ooredoo.qa', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Ooredoo_logo.svg' }),

  // مملكة البحرين
  makeBank('bbk', 'بنك البحرين والكويت', 'BANK OF BAHRAIN AND KUWAIT', '#005A9C', '400138, 415254, 521191', { colorDark: '#00355C', colorLight: '#E6EFF5', supportPhone: '+97317207777', website: 'bbkonline.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Bank_of_Bahrain_and_Kuwait_logo.svg' }),
  makeBank('nbb', 'بنك البحرين الوطني', 'NATIONAL BANK OF BAHRAIN', '#D71921', '407197, 457828, 521661', { colorDark: '#800E13', colorLight: '#FCE8E9', supportPhone: '+97317214433', website: 'nbbonline.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/National_Bank_of_Bahrain_logo.svg' }),
  makeBank('alsalam', 'مصرف السلام', 'AL SALAM BANK', '#004A7C', '406136, 520058', { colorDark: '#002B47', colorLight: '#E6EDF2', supportPhone: '+97317005500', website: 'alsalambank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Al_Salam_Bank_logo.svg' }),
  makeBank('bisb', 'بنك البحرين الإسلامي', 'BAHRAIN ISLAMIC BANK', '#1D252C', '428065, 520058', { colorDark: '#0F1317', colorLight: '#E8E9EA', supportPhone: '+97317515151', website: 'bisb.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/BisB_logo.svg' }),
  makeBank('khaleeji', 'خليجي بنك', 'KHALEEJI BANK', '#C8102E', '431050, 520192', { colorDark: '#75091B', colorLight: '#FAE7EA', supportPhone: '+97317540054', website: 'khaleejibank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Khaleeji_Bank_logo.svg' }),
  makeBank('ilabank', 'بنك الى', 'ILA BANK', '#10B981', '507803, 539922', { colorDark: '#056043', colorLight: '#E6F8F2', supportPhone: '+97317123456', website: 'databank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Ila_Bank_logo.svg' }),
  makeBank('benefitpay', 'بنفت باي', 'BENEFITPAY', '#2B3990', '400000, 500000', { colorDark: '#151D4A', colorLight: '#EAEBF5', supportPhone: '+97317123456', website: 'benefit.bh', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/BenefitPay_logo.png' }),
  makeBank('stcpay_bh', 'اس تي سي باي البحرين', 'STC PAY BAHRAIN', '#4F008C', '502220, 520230', { colorDark: '#2D0052', colorLight: '#F2E6FA', supportPhone: '+97333124124', website: 'stcpay.com.bh', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/STC_Bank_logo.svg' }),

  // سلطنة عمان
  makeBank('bankmuscat', 'بنك مسقط', 'BANK MUSCAT', '#E31B23', '400138, 458838, 521191, 540978', { colorDark: '#850F14', colorLight: '#FCE8E9', supportPhone: '+96824795555', website: 'bankmuscat.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Bank_Muscat_logo.svg' }),
  makeBank('nbo', 'البنك الوطني العماني', 'NATIONAL BANK OF OMAN', '#005826', '407197, 457828, 521661', { colorDark: '#003316', colorLight: '#E6F0EA', supportPhone: '+96824770000', website: 'nbo.om', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/25/National_Bank_of_Oman_logo.svg' }),
  makeBank('bankdhofar', 'بنك ظفار', 'BANK DHOFAR', '#002B49', '406136, 428065, 520058', { colorDark: '#001626', colorLight: '#E6EBF0', supportPhone: '+96824791111', website: 'bankdhofar.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Bank_Dhofar_logo.svg' }),
  makeBank('sohar', 'صحار الدولي', 'SOHAR INTERNATIONAL', '#A31D24', '400138, 521191', { colorDark: '#5E1014', colorLight: '#F8E8E9', supportPhone: '+96824730000', website: 'soharinternational.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Sohar_International_logo.svg' }),
  makeBank('oab', 'بنك عمان العربي', 'OMAN ARAB BANK', '#003366', '407197, 521661', { colorDark: '#001F3F', colorLight: '#E6ECF2', supportPhone: '+96824754444', website: 'oman-arab-bank.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Oman_Arab_Bank_logo.svg' }),
  makeBank('nizwa', 'بنك نزوى', 'BANK NIZWA', '#5C2D91', '428065, 520058', { colorDark: '#331952', colorLight: '#EFEBF4', supportPhone: '+96824900000', website: 'banknizwa.om', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Bank_Nizwa_logo.svg' }),
  makeBank('alizz', 'بنك العز الإسلامي', 'ALIZZ ISLAMIC BANK', '#005B36', '428065, 520058', { colorDark: '#003620', colorLight: '#E6F0EC', supportPhone: '+96880072265', website: 'alizzislamic.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Alizz_Islamic_Bank_logo.svg' }),

  // المحافظ والبنوك الرقمية العالمية
  makeBank('wise', 'وايز', 'WISE', '#2E524A', '459661, 535564, 539922', { colorDark: '#182C28', colorLight: '#EAF0EE', supportPhone: '+442036995066', website: 'wise.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Wise_Logo.svg' }),
  makeBank('revolut', 'ريفولوت', 'REVOLUT', '#0075FF', '416556, 416598, 435044, 459654, 525861, 527346, 530212, 535054, 535200, 541348', { colorDark: '#004399', colorLight: '#E6F1FF', supportPhone: '+442033228352', website: 'revolut.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Revolut_logo.svg' }),
  makeBank('paypal', 'بايبال', 'PAYPAL', '#003087', '400000, 510000', { colorDark: '#001A4A', colorLight: '#E6ECF5', supportPhone: '+18882211161', website: 'paypal.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' }),
  makeBank('payoneer', 'بايونير', 'PAYONEER', '#FF4800', '529922, 539922', { colorDark: '#992B00', colorLight: '#FFEFE6', supportPhone: '+118882512111', website: 'payoneer.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Payoneer_logo.svg' }),
  makeBank('skrill', 'سكريل', 'SKRILL', '#811832', '512683, 535825', { colorDark: '#4A0D1D', colorLight: '#F5E8EB', supportPhone: '+442033082520', website: 'skrill.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Skrill_logo.svg' }),
  makeBank('neteller', 'نيتيلر', 'NETELLER', '#80B820', '512683, 535825', { colorDark: '#4A6B13', colorLight: '#F2F8E8', supportPhone: '+442033082520', website: 'neteller.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Neteller_logo.svg' }),
  makeBank('n26', 'ان ٢٦', 'N26', '#36A18B', '516809, 535564', { colorDark: '#1D5A4E', colorLight: '#EBF6F4', supportPhone: '+4930364286880', website: 'n26.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/62/N26_logo.svg' }),
  makeBank('monzo', 'مونزو', 'MONZO', '#14233C', '535522, 539922', { colorDark: '#0A121F', colorLight: '#E7E9EC', supportPhone: '+448008021281', website: 'monzo.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Monzo_logo.svg' }),
  makeBank('zen', 'زين', 'ZEN.COM', '#000000', '516138, 539922', { colorDark: '#141414', colorLight: '#F2F2F2', supportPhone: '+48221131111', website: 'zen.com', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/ZEN.COM_logo.svg' }),
  makeBank('cashapp', 'كاش أب', 'CASH APP', '#00D632', '400000, 500000', { colorDark: '#007A1D', colorLight: '#E6FCEB', supportPhone: '+18009691940', website: 'cash.app', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Cash_App_main_logo.svg' }),
];

const DEFAULT_BANKS_VERSION = 'gcc-banks-2026-08-01-v2';

function normalizeLegacyBank(value: unknown): BankSeed | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const key = String(row.key ?? '').trim().toLowerCase();
  const name = String(row.name ?? '').trim();
  if (!key || !name) return null;
  const bins = String(row.bins ?? '');
  return {
    key,
    type: row.type === 'wallet' || row.type === 'bank' ? row.type : inferType(key, bins),
    name,
    nameEn: String(row.nameEn ?? ''),
    color: String(row.color ?? '#1A3A5C'),
    colorDark: String(row.colorDark ?? '#0F2440'),
    colorLight: String(row.colorLight ?? '#EDF2F7'),
    otpMessage: String(row.otpMessage ?? ''),
    supportPhone: String(row.supportPhone ?? ''),
    website: String(row.website ?? ''),
    bins,
    logoUrl: String(row.logoUrl ?? ''),
    enabled: row.enabled !== false,
  };
}

function ensureSeeded(): void {
  if (db.bank.count() === 0) {
    const legacy = db.setting.findUnique({ where: { key: 'banksData' } });
    let seeds: BankSeed[] = [];
    if (legacy?.value) {
      try {
        const parsed = JSON.parse(legacy.value);
        if (Array.isArray(parsed)) seeds = parsed.map(normalizeLegacyBank).filter((bank): bank is BankSeed => bank !== null);
      } catch {
        seeds = [];
      }
    }
    for (const bank of seeds.length > 0 ? seeds : DEFAULT_BANKS) db.bank.create({ data: bank });
  }

  const versionKey = 'defaultBanksVersion';
  const currentVersion = db.setting.findUnique({ where: { key: versionKey } });
  if (currentVersion?.value === DEFAULT_BANKS_VERSION) return;

  for (const bank of DEFAULT_BANKS) {
    const current = db.bank.findUnique({ where: { key: bank.key } });
    if (current) {
      db.bank.update({ where: { key: bank.key }, data: { ...bank, enabled: current.enabled } });
    } else {
      db.bank.create({ data: bank });
    }
  }

  db.setting.upsert({
    where: { key: versionKey },
    create: { key: versionKey, value: DEFAULT_BANKS_VERSION },
    update: { value: DEFAULT_BANKS_VERSION },
  });
}

const bankFields = {
  name: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().max(160),
  color: z.string().trim().max(32),
  colorDark: z.string().trim().max(32),
  colorLight: z.string().trim().max(32),
  otpMessage: z.string().max(500),
  supportPhone: z.string().max(80),
  website: z.string().max(300),
  bins: z.string().max(1000),
  logoUrl: z.string().max(1_500_000),
  enabled: z.boolean(),
};

const createInput = z.object({
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_-]+$/i),
  type: z.enum(['bank', 'wallet']).optional(),
  ...bankFields,
});

const updateInput = z.object({
  key: z.string().trim().min(2).max(80),
  data: z.object({ type: z.enum(['bank', 'wallet']).optional(), ...bankFields }).partial(),
});

export const banksRouter = router({
  publicList: publicProcedure.query(() => {
    ensureSeeded();
    return db.bank.findMany({ where: { enabled: true }, orderBy: { id: 'asc' } });
  }),

  list: adminProcedure.query(() => {
    ensureSeeded();
    return db.bank.findMany({ orderBy: { id: 'asc' } });
  }),

  create: adminProcedure.input(createInput).mutation(({ input }) => {
    ensureSeeded();
    const key = input.key.toLowerCase();
    if (db.bank.findUnique({ where: { key } })) {
      throw new TRPCError({ code: 'CONFLICT', message: 'معرف البنك أو المحفظة مستخدم مسبقاً' });
    }
    return db.bank.create({ data: { ...input, key, type: input.type ?? inferType(key, input.bins) } });
  }),

  update: adminProcedure.input(updateInput).mutation(({ input }) => {
    ensureSeeded();
    const current = db.bank.findUnique({ where: { key: input.key } });
    if (!current) throw new TRPCError({ code: 'NOT_FOUND', message: 'البنك أو المحفظة غير موجود' });
    const nextBins = input.data.bins ?? current.bins;
    return db.bank.update({
      where: { key: input.key },
      data: { ...input.data, type: input.data.type ?? inferType(current.key, nextBins) },
    });
  }),

  toggle: adminProcedure.input(z.object({ key: z.string(), enabled: z.boolean() })).mutation(({ input }) => {
    ensureSeeded();
    return db.bank.update({ where: { key: input.key }, data: { enabled: input.enabled } });
  }),

  delete: adminProcedure.input(z.object({ key: z.string() })).mutation(({ input }) => {
    ensureSeeded();
    db.bank.delete({ where: { key: input.key } });
    return { success: true };
  }),
});
