import 'package:flutter/material.dart' as m;
import 'package:flutter/material.dart' hide Text;
import 'package:shared_preferences/shared_preferences.dart';

/// App language (English / Arabic). Switching rebuilds the app with the right text direction.
class Lang {
  static final ValueNotifier<String> code = ValueNotifier('en');
  static bool get ar => code.value == 'ar';
  static Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    code.value = p.getString('lang') ?? 'en';
  }

  static Future<void> set(String c) async {
    code.value = c;
    final p = await SharedPreferences.getInstance();
    await p.setString('lang', c);
  }
}

String quoteAmount(Map q) {
  final n = (q['amount'] as num).toDouble();
  final pieces = n.toStringAsFixed(n == n.roundToDouble() ? 0 : 2).split('.');
  final grouped = pieces[0]
      .replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
  var out = grouped + (pieces.length > 1 ? '.${pieces[1]}' : '');
  if (Lang.ar) {
    const latin = '0123456789';
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    out = out
        .split('')
        .map((c) => latin.contains(c)
            ? arabic[latin.indexOf(c)]
            : c == ','
                ? '٬'
                : c == '.'
                    ? '٫'
                    : c)
        .join();
  }
  final curr = q['currency'] == 'EGP'
      ? (Lang.ar ? 'ج.م' : 'EGP')
      : q['currency'].toString();
  return '$out $curr';
}

String svcName(Map s) => Lang.ar && (s['nameAr'] ?? '').toString().isNotEmpty
    ? s['nameAr'] as String
    : (s['name'] ?? '').toString();

const _ar = <String, String>{
  'Company service': 'تخصص الشركة',
  "Can't find your service?": 'مش لاقي الخدمة اللي محتاجها؟',
  'Describe your need to the company': 'ابعت تفاصيل طلبك للشركة',
  'Request another service': 'طلب خدمة تانية',
  'Service you need': 'الخدمة اللي محتاجها',
  'The company will review your need and contact you. Sending this form does not confirm availability, a visit or a price.':
      'الشركة هتراجع طلبك وتتواصل معاك. إرسال النموذج مش تأكيد توفر الخدمة أو زيارة أو سعر.',
  'Custom service': 'طلب خدمة خاصة',
  'The company is reviewing your custom need. Follow up in the team chat.':
      'الشركة بتراجع طلبك الخاص. تابع مع الفريق من المحادثة.',
  'Describe the service you need (3 to 100 characters)':
      'اكتب الخدمة اللي محتاجها من ٣ لـ ١٠٠ حرف',
  'Classify the custom request before quoting':
      'حدد تخصص الطلب الخاص قبل عرض السعر',
  'Classify the custom request before assignment':
      'حدد تخصص الطلب الخاص قبل التعيين',
  'Payment arrangements must be confirmed with the company.':
      'طريقة وموعد الدفع لازم يتأكدوا مع الشركة.',
  'No payment is collected here. Saving a preference does not set a payment policy or create a booking.':
      'مفيش تحصيل فلوس هنا. حفظ التفضيل مش تحديد لسياسة دفع ومش حجز خدمة.',
  'Rooms inspected and required work recorded':
      'تمت معاينة الغرف وتحديد الأعمال المطلوبة',
  'Paint two rooms and repair cracks after inspection':
      'دهان غرفتين ومعالجة الشروخ حسب المعاينة',
  'First Name': 'الاسم الأول',
  'Last Name': 'اسم العائلة',
  'My profile': 'ملفي الشخصي',
  'Profile saved': 'تم حفظ الملف الشخصي',
  'Management account': 'حساب الإدارة',
  'Customer account': 'حساب عميل',
  'Company technician': 'فني الشركة',
  'Contact details': 'بيانات التواصل',
  'Work area': 'منطقة العمل',
  'Area (optional)': 'المنطقة (اختياري)',
  'Village, hamlet or area (optional)': 'القرية أو النجع أو المنطقة (اختياري)',
  'Type to search. If you do not find it, just write it.': 'اكتب وهتظهرلك اقتراحات. لو مش لاقيها اكتبها عادي.',
  'Use my location': 'استخدم موقعي',
  'Location access was not allowed. Type your village or area instead.': 'مسموحش بالوصول للموقع. اكتب القرية أو المنطقة بدلاً من كده.',
  'Location detected. You can change the place if it is wrong.': 'تم تحديد موقعك. تقدر تغير المكان لو غلط.',
  'Location detected. Check the place name or type your own.': 'تم تحديد موقعك. راجع اسم المكان أو اكتب اسمه.',
  'Location saved, but the place name was not found. Type your village or area.': 'اتحفظ موقعك بس مش لاقيين اسم المكان. اكتب القرية أو المنطقة.',
  'Could not get your location. Type your village or area instead.': 'مقدرناش نحدد موقعك. اكتب القرية أو المنطقة بدلاً من كده.',
  'Position': 'الوظيفة',
  'Your areas': 'مناطقك',
  'Not set yet': 'لسه متحددش',
  'Set by the company': 'بتتحدد من الشركة',
  'Address name': 'اسم العنوان',
  'What happened?': 'إيه اللي حصل؟',
  'Your comment (optional)': 'تعليقك (اختياري)',
  'Open task': 'افتح المهمة',
  'Retry': 'حاول تاني',
  'Save': 'حفظ',

  'Bio': 'نبذة عنك',
  'City or area': 'المدينة أو المنطقة',
  'Work profile': 'ملف العمل',
  'Services assigned by management': 'الخدمات المحددة من الإدارة',
  'No services assigned. Contact management.':
      'مفيش خدمات محددة. تواصل مع الإدارة.',
  'Management controls service permissions and assignments.':
      'الإدارة بتحدد صلاحيات الخدمات وبتعيّن الشغل.',
  'Save profile': 'حفظ الملف الشخصي',
  'Your email and account role cannot be changed here.':
      'البريد الإلكتروني ونوع الحساب مش بيتغيروا من هنا.',
  'Tell the company about the space and finishing work you need. The team inspects the site before preparing the scope and price.':
      'وضّح للشركة تفاصيل المكان وأعمال التشطيب اللي محتاجها. الفريق بيعاين المكان قبل تحديد نطاق الشغل والسعر.',
  'Describe the AC problem, number of units and any symptoms. The team inspects the equipment before sending a repair or maintenance quote.':
      'اكتب مشكلة التكييف وعدد الأجهزة وأي أعراض لاحظتها. الفريق بيفحص الأجهزة قبل إرسال عرض سعر للإصلاح أو الصيانة.',
  'Tell the company which appliance needs attention and describe the fault. Inspection findings determine the proposed work and price.':
      'وضّح نوع الجهاز والعطل اللي فيه. نتيجة المعاينة هي اللي بتحدد الشغل المقترح والسعر.',
  'Describe the work you need. The company reviews your request and arranges an inspection before sending a quote.':
      'وضّح الشغل اللي محتاجه. الشركة بتراجع الطلب وبتنسق المعاينة قبل إرسال عرض السعر.',
  'How your request works': 'خطوات طلبك',
  'Tell us what you need': 'قول لنا محتاج إيه',
  'Company inspection': 'معاينة الشركة',
  'Review the company quote': 'راجع عرض سعر الشركة',
  'Accept before work is assigned': 'وافق قبل تعيين فريق التنفيذ',
  'No final price is set before inspection. Review the scope and price before accepting.':
      'السعر النهائي بيتحدد بعد المعاينة. راجع نطاق الشغل والسعر قبل الموافقة.',
  'Request inspection': 'طلب معاينة',
  'Request details': 'تفاصيل الطلب',
  'Refresh': 'تحديث',
  'Your requirement': 'تفاصيل الشغل المطلوب',
  'Submitted': 'تاريخ الطلب',
  'Request progress': 'مراحل الطلب',
  'Inspection': 'المعاينة',
  'The company will contact you to coordinate the inspection.':
      'الشركة هتتواصل معاك لتنسيق المعاينة.',
  'Quote version': 'نسخة عرض السعر',
  'Assigned team member': 'الفني المسؤول',
  'Edit address': 'تعديل العنوان',
  'Address label': 'اسم العنوان',
  'Full address': 'العنوان بالتفصيل',
  'No saved addresses yet': 'مفيش عناوين محفوظة لسه',
  'Delete': 'حذف',
  'Delete address?': 'حذف العنوان؟',
  'Tap an address to edit it.': 'اضغط على العنوان لتعديله.',
  'Choose a saved address': 'اختار عنوان محفوظ',
  'All requests': 'كل الطلبات',
  'Active': 'نشط',
  'No requests in this view': 'مفيش طلبات في القسم ده',
  'Request received. The company will coordinate inspection and send a quote for your approval. Track it in Projects.':
      'تم استلام طلبك. الشركة هتنسق المعاينة وتبعت عرض سعر لموافقتك. تابع الطلب من مشاريعي.',
  'Name must contain 1 to 60 characters': 'الاسم لازم يكون من حرف لـ ٦٠ حرف',
  'Enter a valid phone number': 'اكتب رقم موبايل صحيح',
  'Area must be at most 100 characters': 'المنطقة بحد أقصى ١٠٠ حرف',
  'Each address needs a label and full address (max 10)':
      'كل عنوان محتاج اسم وتفاصيل كاملة، بحد أقصى ١٠ عناوين',
  'Back': 'رجوع',
  'Service work agreed after inspection':
      'أعمال الخدمة المتفق عليها بعد المعاينة',
  'Welcome to Tazbeeta': 'أهلا بيك في تظبيطه',
  'Your home, our responsibility': 'بيتك مسؤوليتنا',
  'Request a service. Our company inspects, sends a quote, and assigns the team after you accept.':
      'اطلب الخدمة. شركتنا بتعاين وبتبعت عرض سعر، وبعد موافقتك بنعيّن فريق التنفيذ.',
  'Create customer account': 'إنشاء حساب عميل',
  'Customer login': 'دخول العملاء',
  'Team login': 'دخول فريق الشركة',
  'Team accounts are created by company management.':
      'حسابات فريق الشغل بتتعمل من إدارة الشركة.',
  'Request received': 'تم استلام الطلب',
  'Inspection recorded': 'تمت المعاينة',
  'Awaiting your approval': 'بانتظار موافقتك',
  'Quote accepted': 'تم قبول العرض',
  'Company quote': 'عرض سعر الشركة',
  'Review and accept quote': 'مراجعة وقبول عرض السعر',
  'Accept this quote?': 'قبول عرض السعر؟',
  'Accept quote': 'قبول العرض',
  'Chat with team': 'محادثة الشركة',
  'Record inspection': 'تسجيل المعاينة',
  'Inspection notes': 'ملاحظات المعاينة',
  'Save inspection': 'حفظ المعاينة',
  'Send company quote': 'إرسال عرض سعر الشركة',
  'Amount': 'المبلغ',
  'Currency code': 'رمز العملة',
  'Included work': 'الأعمال المشمولة',
  'Enter the agreed inspection findings and actual company price.':
      'اكتب نتيجة المعاينة وسعر الشركة الفعلي.',
  'Send quote': 'إرسال عرض السعر',
  'Team workspace': 'مساحة عمل الفريق',
  'Password recovery is currently unavailable.':
      'استعادة كلمة المرور غير متاحة حاليًا.',
  'My workday': 'يوم الشغل',
  'Welcome back': 'أهلا بيك',
  'Your assigned work, all in one place': 'مهامك من الفريق، كلها في مكان واحد',
  'Active jobs': 'مهام نشطة',
  'Next assignment': 'مهمتك الجاية',
  'All jobs': 'كل المهام',
  'Manage job': 'إدارة المهمة',
  'No active assignments. The team will assign your next job.':
      'مفيش مهام نشطة. الفريق هيعيّن لك المهمة الجاية.',
  'The team assigns jobs that match your skills. Update your availability when you finish.':
      'الفريق بيعيّن لك المهام المناسبة لتخصصك. حدّث حالتك لما تخلص الشغل.',
  'Could not load jobs': 'تعذر تحميل المهام',
  'Settings': 'الإعدادات',
  'Account': 'الحساب',
  'Account type': 'نوع الحساب',
  'Technician': 'فني',
  'Customer': 'عميل',
  'App preferences': 'تفضيلات التطبيق',
  'Notification preferences': 'تفضيلات التنبيهات',
  'Job updates': 'تحديثات المهام',
  'Request updates': 'تحديثات الطلبات',
  'Status and assignment updates': 'تحديثات الحالة وتعيين الفني',
  'Conversation updates': 'تحديثات المحادثات',
  'Preferences are saved on this phone. Push delivery is not connected.':
      'التفضيلات محفوظة على الموبايل ده. إشعارات الموبايل لسه مش مربوطة.',
  'Save settings': 'حفظ الإعدادات',
  'Settings saved': 'تم حفظ الإعدادات',
  'About Tazbeeta': 'عن تظبيطه',
  'Home services from one team': 'خدمات بيتك من فريق واحد',
  'Pay the team after the service is completed':
      'الدفع للفريق بعد إتمام الخدمة',
  'Currently unavailable': 'غير متاح حاليًا',
  'Cash payments are currently unavailable.': 'الدفع النقدي غير متاح حاليًا.',
  'Payment preference saved.': 'تم حفظ طريقة الدفع.',
  'Thank you for your feedback.': 'شكرًا على تقييمك.',
  'No payment is collected and no card details are stored.':
      'لا يتم تحصيل أموال أو حفظ بيانات بطاقات.',
  'Sample workspace · Explore requests, chat and team assignment':
      'بيانات تجريبية · جرّب الطلبات والمحادثات وتوزيع الفنيين',
  'Home': 'المنزل',
  'Family home': 'بيت العائلة',
  'Nasr City, Cairo': 'مدينة نصر، القاهرة',
  'Maadi, Cairo': 'المعادي، القاهرة',
  'The team arrived on time and explained the repair.':
      'الفريق وصل في المعاد وشرح خطوات الإصلاح.',
  'Clear follow-up and tidy work.': 'متابعة واضحة وشغل نظيف.',
  'Preview only. No payment is collected and no card details are stored.':
      'للمعاينة فقط. لا يتم تحصيل أموال أو حفظ بيانات بطاقات.',
  'Cash after service': 'نقدًا بعد الخدمة',
  'Sample preference, not a payment commitment':
      'اختيار تجريبي وليس التزامًا بالدفع',
  'Card payments': 'الدفع بالبطاقة',
  'Not connected in this prototype': 'غير مربوط في النموذج التجريبي',
  'Save preference': 'حفظ الاختيار',
  'Preference saved for this screen only.': 'تم حفظ الاختيار داخل الشاشة فقط.',
  'How was your experience?': 'كانت تجربتك إيه؟',
  'Local feedback preview. Nothing is posted to an app store or sent to the company.':
      'تقييم تجريبي محلي. لن يتم نشره أو إرساله للشركة.',
  'Your feedback': 'رأيك',
  'Submit feedback': 'إرسال التقييم',
  'Thank you. This is a local preview confirmation.':
      'شكرًا لك. ده تأكيد تجريبي محلي.',
  'Help and support': 'المساعدة والدعم',
  'How the service works': 'الخدمة بتشتغل إزاي؟',
  'Who assigns the technician?': 'مين بيختار الفني؟',
  'The company team reviews requests and assigns a technician. This is not an open marketplace.':
      'فريق الشركة بيراجع الطلب وبيعيّن الفني. ده مش سوق مفتوح.',
  'Can I message the technician?': 'أقدر أكلم الفني؟',
  'Open an assigned request and tap Chat. Messages in this prototype stay on this device only.':
      'افتح طلب متعيّن له فني واضغط محادثة. رسائل النموذج على الجهاز ده بس.',
  'Can I cancel a request?': 'أقدر ألغي الطلب؟',
  'The prototype allows cancellation before work starts. Real service rules are not set yet.':
      'النموذج يسمح بالإلغاء قبل بدء الشغل. قواعد الخدمة الحقيقية لسه مش محددة.',
  'Support contact details are not configured. This screen does not send messages or make calls.':
      'بيانات الدعم لسه مش مضافة. الشاشة لا ترسل رسائل أو تجري مكالمات.',
  'Service from one team': 'خدمة من فريق واحد',
  'The company receives your request and assigns the right technician.':
      'الشركة بتستقبل طلبك وبتعيّن الفني المناسب.',
  'Sample location selected. Nothing was shared.':
      'تم اختيار موقع تجريبي. لم تتم مشاركة أي شيء.',
  'Preview only. No reset email will be sent.':
      'للمعاينة فقط. لن يتم إرسال بريد لاستعادة كلمة المرور.',
  'Enter the email address you used to register.': 'اكتب البريد اللي سجلت بيه.',
  'Address': 'العنوان',
  'Address (or share location)': 'العنوان أو شارك موقعك',
  'Message': 'رسالة',
  'Explore': 'استكشف',
  'Projects': 'طلباتي',
  'Jobs': 'المهام',
  'Messages': 'الرسائل',
  'More': 'المزيد',
  'Start': 'ابدأ',
  'Skip': 'تخطّي',
  'Next': 'التالي',
  'Get started': 'يلا نبدأ',
  'Pick the service you need': 'اختار الخدمة اللي محتاجها',
  'Browse the company services. Cannot find yours? Describe it and our team will follow up.':
      'اتصفح خدمات الشركة. مش لاقي خدمتك؟ اكتب طلبك وفريقنا هيتواصل معاك.',
  'We inspect, then send a quote': 'بنعاين وبعدين نبعت عرض السعر',
  'The team checks the job first and sends a clear quote. Nothing starts until you accept it.':
      'الفريق بيعاين الشغل الأول ويبعت عرض سعر واضح. مفيش حاجة بتبدأ إلا بعد موافقتك.',
  'Follow every step': 'تابع كل خطوة',
  'Track your request stage by stage and chat with the team from the app.':
      'تابع طلبك مرحلة بمرحلة وكلّم الفريق من التطبيق.',
  'WE CAN FIX IT': 'احنا معاك',
  'Tech repair\nservice': 'صيانة وتشطيبات\nلبيتك',
  'GIVE US A CALL': 'تواصل معانا',
  'Continue': 'متابعة',
  'Preview only. No real account or technician approval is created.':
      'للمعاينة فقط. لن يتم إنشاء حساب حقيقي أو اعتماد فني.',
  'Use your email to sign in and confirm your account.':
      'استخدم بريدك لتسجيل الدخول وتأكيد حسابك.',
  'I agree to the': 'أوافق على',
  'Terms and Privacy': 'الشروط والخصوصية',
  'Could not load the terms. Try again.': 'تعذر تحميل الشروط. حاول مرة تانية.',
  'Registration is not available until the service terms are ready.':
      'إنشاء الحساب غير متاح لحين تجهيز شروط الخدمة.',
  'Join as a technician': 'انضم كفني',
  'Phone number': 'رقم الموبايل',
  'Your specialty': 'تخصصك',
  'Electrical Appliances': 'الأجهزة الكهربائية',
  'Work area (city or district)': 'منطقة الشغل (المدينة أو الحي)',
  'Years of experience': 'سنين الخبرة',
  'The Tazbeeta team reviews technicians and assigns the jobs.':
      'فريق تظبيطه بيراجع الفنيين وهو اللي بيوزّع الشغل.',
  'Preview version': 'نسخة معاينة',
  'This preview uses sample data stored on this phone only. Accounts and requests are not saved on a server yet.':
      'النسخة دي ببيانات تجريبية على الموبايل بس. الحسابات والطلبات لسه مش محفوظة على سيرفر.',
  'Select a Role': 'اختر نوع الحساب',
  'Demo with sample data': 'نسخة تجريبية ببيانات وهمية',
  'Open as customer': 'افتح كعميل',
  'Open as technician': 'افتح كفني',
  'This build has no server address configured.\nInstall the demo build or a configured release.':
      'النسخة دي مش متظبط فيها عنوان السيرفر.\nثبّت النسخة التجريبية أو نسخة معدّة.',
  'I need a service': 'محتاج خدمة',
  'I am a technician': 'أنا فني',
  'Tell us what you need\nand we send a technician':
      'قولنا محتاج إيه\nوهنبعتلك فني',
  'See the jobs the company\nassigns to you':
      'شوف الشغل اللي\nالشركة بتوزعه عليك',
  'Login': 'تسجيل الدخول',
  'Log in': 'تسجيل الدخول',
  'Sign up': 'إنشاء حساب',
  'I have an account': 'عندي حساب',
  'Email': 'البريد الإلكتروني',
  'Password': 'كلمة المرور',
  'First name': 'الاسم الأول',
  'Last name': 'اسم العائلة',
  'Forget password?': 'نسيت كلمة المرور؟',
  'Forget password': 'نسيت كلمة المرور',
  'Define new password': 'تعيين كلمة مرور جديدة',
  'Enters the email address you used to register. The company will send you a link to define a new password.':
      'اكتب البريد الإلكتروني المسجّل به والشركة هتبعتلك رابط لتعيين كلمة مرور جديدة.',
  'Your request was sent to the company. They will send you a link to set a new password.':
      'طلبك اتبعت للشركة. هيبعتولك رابط لتعيين كلمة مرور جديدة.',
  'Password reset by email is not available yet, so no email was sent. Please contact support to reset your password.':
      'إعادة تعيين كلمة المرور بالبريد غير متاحة لسه، ولا اتبعتت رسالة. تواصل مع الدعم.',
  'This email address have no account': 'البريد ده مالوش حساب',
  'Account created. Confirm your email address, then log in.':
      'اتعمل الحساب. أكّد بريدك الإلكتروني وبعدين سجّل دخول.',
  'Must be at least 8 characters': 'لازم 8 حروف على الأقل',
  'Must have at least one symbol or number': 'لازم يحتوي على رمز أو رقم',
  'Can not contain spaces': 'ممنوع المسافات',
  'Can not include your name or email address': 'ممنوع يحتوي على اسمك أو بريدك',
  'Agree and continue': 'أوافق وأكمل',
  'By selecting Agree and continue, I agree to Tazbeeta ':
      'باختياري أوافق وأكمل، أنا أوافق على ',
  'Terms of Service': 'شروط الخدمة',
  'Payments Terms of Service': 'شروط المدفوعات',
  'Notification Policy': 'سياسة الإشعارات',
  'Privacy Policy': 'سياسة الخصوصية',
  ' and ': ' و',
  ' and acknowledge the ': ' وأقرّ بـ',
  ', ': '، ',
  '.': '.',
  'Allow location access?': 'السماح بالوصول للموقع؟',
  'Allow location access': 'السماح بالوصول للموقع',
  'We need your location access to easily find our\nservices around you.':
      'محتاجين موقعك عشان نلاقي\nالخدمات القريبة منك بسهولة.',
  'Skip and Start': 'تخطّي وابدأ',
  'Skip this step': 'تخطّي الخطوة',
  'Could not get your location. Check permission and GPS.':
      'مقدرناش نحدد موقعك. راجع الصلاحية والـGPS.',
  'Could not get your location. You can skip this step.':
      'مقدرناش نحدد موقعك. تقدر تتخطى الخطوة.',
  'Location access was not allowed. You can skip this step.':
      'ماتسمحش بالوصول للموقع. تقدر تتخطى الخطوة.',
  'Good Morning': 'صباح الخير',
  'Good Afternoon': 'مساء الخير',
  'Good Evening': 'مساء الخير',
  'Hello': 'أهلاً',
  'Search for a service': 'ابحث عن خدمة',
  'Popular Services': 'الخدمات الشائعة',
  'View all  ›': 'عرض الكل  ‹',
  'View all': 'عرض الكل',
  'Browse all categories': 'كل الأقسام',
  "Don't see what you are looking for?": 'مش لاقي اللي بتدوّر عليه؟',
  'View all services': 'عرض كل الخدمات',
  'Popular Searches': 'عمليات بحث شائعة',
  'Top services': 'أهم الخدمات',
  'No matching service': 'مفيش خدمة مطابقة',
  'AC Maintenance': 'صيانة التكييف',
  'Finishing & Renovation': 'التشطيبات والتجديد',
  'Electrical Appliance Maintenance': 'صيانة الأجهزة الكهربائية',
  'What do you need done?': 'إيه المطلوب؟',
  'Send request': 'إرسال الطلب',
  'Request sent. The team will assign a technician. Track it in Projects.':
      'اتبعت الطلب. الفريق هيعيّن فني، وتابعه من «طلباتي».',
  'Only customer accounts can create requests.':
      'حسابات العملاء فقط تقدر تعمل طلبات.',
  'Share your location so the team can find the nearest technician.':
      'شارك موقعك عشان الفريق يلاقي أقرب فني.',
  'Share location': 'مشاركة الموقع',
  'Location shared just now.': 'اتشارك الموقع دلوقتي.',
  'Current location': 'الموقع الحالي',
  'Available for jobs': 'متاح للمهام',
  'No jobs yet': 'مفيش مهام لسه',
  'No projects yet. Pick a service in Explore.':
      'مفيش طلبات لسه. اختر خدمة من «استكشف».',
  'No messages yet': 'مفيش رسائل لسه',
  'Chat': 'محادثة',
  'Start work': 'بدء العمل',
  'Mark completed': 'تم الإنجاز',
  'Cancel': 'إلغاء',
  'In progress': 'جاري التنفيذ',
  'Technician assigned': 'تم تعيين فني',
  'Pending': 'قيد الانتظار',
  'Assigned': 'تم التعيين',
  'Completed': 'مكتمل',
  'Cancelled': 'ملغي',
  'Saved Addresses': 'العناوين المحفوظة',
  'Add address': 'إضافة عنوان',
  'New address': 'عنوان جديد',
  'Payment Methods': 'طرق الدفع',
  'Invite your friends': 'ادعُ أصدقاءك',
  'Rate our app': 'قيّم التطبيق',
  'About Us': 'من نحن',
  'Log out': 'تسجيل الخروج',
  'Introduce your friends to the easiest way to find and hire professionals for your needs.':
      'عرّف أصحابك بأسهل طريقة تلاقي بيها فني متخصص.',
  'We will email you request updates and receipts.':
      'هنبعتلك تحديثات الطلبات والإيصالات بالبريد.',
  'Not available': 'غير متاح',
  'Something went wrong': 'حصل خطأ',
  'YOUR INTERNET IS NOT AVAILABLE': 'مفيش اتصال بالإنترنت',
  'RETRY': 'إعادة المحاولة',
  'Try switching to a different connection or reset your internet to find a professional.':
      'جرّب تغيّر الاتصال أو أعد تشغيل الإنترنت.',
  'Language': 'اللغة',
  'English': 'English',
  'Arabic': 'العربية',
};

const _ar2 = <String, String>{
  'Hello, ': 'أهلاً، ',
  'Good Morning, ': 'صباح الخير، ',
  'Good Afternoon, ': 'مساء الخير، ',
  'Good Evening, ': 'مساء الخير، '
};

String tr(String s) {
  if (!Lang.ar) return s;
  final d = _ar[s];
  if (d != null) return d;
  for (final e in _ar2.entries) {
    if (s.startsWith(e.key)) return e.value + s.substring(e.key.length);
  }
  if (s.startsWith('Password strength: ')) {
    final w = s.substring(19);
    return 'قوة كلمة المرور: ${w == 'Strong' ? 'قوية' : w == 'Weak' ? 'ضعيفة' : w}';
  }
  if (s.startsWith('* ')) return '* ${tr(s.substring(2))}';
  if (s.endsWith(' is not available in this version'))
    return '${tr(s.replaceFirst(' is not available in this version', ''))} غير متاح في هذه النسخة';
  if (s.startsWith('Address ')) return 'عنوان ${s.substring(8)}';
  return s;
}

/// Drop-in Text that translates its string when the app language is Arabic.
class Text extends StatelessWidget {
  final String data;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool? softWrap;
  const Text(this.data,
      {super.key,
      this.style,
      this.textAlign,
      this.maxLines,
      this.overflow,
      this.softWrap});
  @override
  Widget build(BuildContext context) {
    Localizations.localeOf(context); // rebuild when the language changes
    final st = Lang.ar
        ? (style ?? const TextStyle()).copyWith(
            fontFamily: 'NotoKufi',
            fontFamilyFallback: const ['Poppins', 'Inter'],
            letterSpacing: 0,
            fontWeight: (style?.fontWeight ?? FontWeight.w400).index >= 5
                ? FontWeight.w700
                : style?.fontWeight)
        : style;
    return m.Text(tr(data),
        style: st,
        textAlign: textAlign,
        maxLines: maxLines,
        overflow: overflow,
        softWrap: softWrap);
  }
}

/// Small EN / AR switch used on the Start screen and in More.
class LangSwitch extends StatelessWidget {
  final Color color;
  const LangSwitch({super.key, this.color = const Color(0xFF0A5A5E)});
  @override
  Widget build(BuildContext context) => ValueListenableBuilder<String>(
      valueListenable: Lang.code,
      builder: (_, code, __) => TextButton.icon(
            onPressed: () => Lang.set(Lang.ar ? 'en' : 'ar'),
            icon: Icon(Icons.language, size: 18, color: color),
            label: m.Text(Lang.ar ? 'English' : 'العربية',
                style: TextStyle(
                    fontFamily: Lang.ar ? 'Inter' : 'NotoKufi',
                    color: color,
                    fontSize: 13,
                    fontWeight: FontWeight.w600)),
          ));
}

/// Maps known error messages (Supabase, network, API) to safe localized text. Never shows raw server text in Arabic mode.
String trErr(String e) {
  if (!Lang.ar) return e;
  final s = e.toLowerCase();
  if (s.contains('invalid login') || s.contains('invalid credentials'))
    return 'البريد أو كلمة المرور غير صحيحة';
  if (s.contains('not confirmed')) return 'أكّد بريدك الإلكتروني الأول';
  if (s.contains('already registered') || s.contains('already exists'))
    return 'البريد ده متسجّل قبل كده';
  if (s.contains('rate limit') || s.contains('too many'))
    return 'محاولات كتير، جرّب بعد شوية';
  if (s.contains('socket') ||
      s.contains('host lookup') ||
      s.contains('network') ||
      s.contains('timeout') ||
      s.contains('connection')) return 'مفيش اتصال بالإنترنت';
  if (s.contains('unauthorized') || s.contains('expired') || s.contains('jwt'))
    return 'سجّل دخول تاني';
  if (s.contains('blocked')) return 'الحساب متوقف، تواصل مع الدعم';
  if (RegExp(r'[\u0600-\u06FF]').hasMatch(e)) return e;
  return tr(e) != e ? tr(e) : 'حصل خطأ، جرّب تاني';
}
