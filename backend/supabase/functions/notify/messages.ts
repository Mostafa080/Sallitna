// What the notifications say, in each person's language (their «view_language»).
// Kept here, not in the app's i18n files, because the server writes them (the app isn't open when they arrive).
// {{name}} = who did it. `_f` / `_m` = that person's gender (Arabic and Hindi change the verb).

export type Lang = 'ar' | 'en' | 'hi';
export type Gender = 'f' | 'm';

const text: Record<Lang, Record<string, string>> = {
  ar: {
    tripStarted: '{{name}} في السوق دلوقتي — لو ناقص حاجة، ضيفوها',
    question_f: '{{name}} بتسأل: مفيش {{item}}. أجيب {{alt}} بداله؟',
    question_m: '{{name}} بيسأل: مفيش {{item}}. أجيب {{alt}} بداله؟',
    questionNoAlt_f: '{{name}} بتسأل: مفيش {{item}}. أعمل إيه؟',
    questionNoAlt_m: '{{name}} بيسأل: مفيش {{item}}. أعمل إيه؟',
    answered_f: '{{name}} ردّت: {{reply}}',
    answered_m: '{{name}} ردّ: {{reply}}',
    // The reply is said to the shopper: `_f` / `_m` here is the shopper's gender
    replyAlt_f: 'أيوه، هاتي {{alt}}',
    replyAlt_m: 'أيوه، هات {{alt}}',
    replyNo: 'لأ، خلاص',
    replyNext: 'سيبه للمرة الجاية',
    added_f: '{{name}} ضافت: {{items}}',
    added_m: '{{name}} ضاف: {{items}}',
    done_f: '{{name}} خلّصت التسوق: اشترت {{bought}}',
    done_m: '{{name}} خلّص التسوق: اشترى {{bought}}',
    doneNotFound_f: '، و{{missing}} ملقيتهاش',
    doneNotFound_m: '، و{{missing}} ملقاهاش',
    more: '+{{n}}',
    listSeparator: '، ',
  },
  en: {
    tripStarted: "{{name}} is at the store now — add anything that's missing",
    question_f: '{{name}} asks: no {{item}}. Get {{alt}} instead?',
    question_m: '{{name}} asks: no {{item}}. Get {{alt}} instead?',
    questionNoAlt_f: '{{name}} asks: no {{item}}. What should I do?',
    questionNoAlt_m: '{{name}} asks: no {{item}}. What should I do?',
    answered_f: '{{name}} replied: {{reply}}',
    answered_m: '{{name}} replied: {{reply}}',
    replyAlt_f: 'Yes, get {{alt}}',
    replyAlt_m: 'Yes, get {{alt}}',
    replyNo: 'No, skip it',
    replyNext: 'Leave it for next time',
    added_f: '{{name}} added: {{items}}',
    added_m: '{{name}} added: {{items}}',
    done_f: '{{name}} finished shopping: bought {{bought}}',
    done_m: '{{name}} finished shopping: bought {{bought}}',
    doneNotFound_f: ', {{missing}} not found',
    doneNotFound_m: ', {{missing}} not found',
    more: '+{{n}}',
    listSeparator: ', ',
  },
  hi: {
    tripStarted: '{{name}} अभी दुकान पर हैं — कुछ चाहिए तो जोड़ दें',
    question_f: '{{name}} पूछ रही हैं: {{item}} नहीं है। उसकी जगह {{alt}} ले लें?',
    question_m: '{{name}} पूछ रहे हैं: {{item}} नहीं है। उसकी जगह {{alt}} ले लें?',
    questionNoAlt_f: '{{name}} पूछ रही हैं: {{item}} नहीं है। क्या करें?',
    questionNoAlt_m: '{{name}} पूछ रहे हैं: {{item}} नहीं है। क्या करें?',
    answered_f: '{{name}} ने जवाब दिया: {{reply}}',
    answered_m: '{{name}} ने जवाब दिया: {{reply}}',
    replyAlt_f: 'हाँ, {{alt}} ले आइए',
    replyAlt_m: 'हाँ, {{alt}} ले आइए',
    replyNo: 'नहीं, रहने दें',
    replyNext: 'अगली बार ले लेंगे',
    added_f: '{{name}} ने जोड़ा: {{items}}',
    added_m: '{{name}} ने जोड़ा: {{items}}',
    done_f: '{{name}} ने खरीदारी पूरी की: {{bought}} लीं',
    done_m: '{{name}} ने खरीदारी पूरी की: {{bought}} लीं',
    doneNotFound_f: ', {{missing}} नहीं मिलीं',
    doneNotFound_m: ', {{missing}} नहीं मिलीं',
    more: '+{{n}}',
    listSeparator: ', ',
  },
};

export function say(lang: Lang, key: string, params: Record<string, string | number> = {}) {
  const template = text[lang]?.[key] ?? text.ar[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''));
}

// «11 حاجة», «حاجتين», «3 items», «5 चीज़ें»
export function things(lang: Lang, n: number) {
  if (lang === 'ar') {
    if (n === 1) return 'حاجة واحدة';
    if (n === 2) return 'حاجتين';
    if (n >= 3 && n <= 10) return `${n} حاجات`;
    return `${n} حاجة`;
  }
  if (lang === 'hi') return n === 1 ? '1 चीज़' : `${n} चीज़ें`;
  return n === 1 ? '1 item' : `${n} items`;
}

// «عيش، لبن، بيض +2» — at most three names, then how many more
export function itemList(lang: Lang, names: string[]) {
  const shown = names.slice(0, 3).join(say(lang, 'listSeparator'));
  return names.length > 3 ? `${shown} ${say(lang, 'more', { n: names.length - 3 })}` : shown;
}
