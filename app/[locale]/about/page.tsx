import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = content[locale as "en" | "zh"] ?? content.zh;
  return {
    title: c.metaTitle,
    description: c.metaDesc,
  };
}

// ── Content data ──

const content: Record<"en" | "zh", {
  back: string;
  metaTitle: string;
  metaDesc: string;
  hero: { badge: string; title: string; subtitle: string };
  story: { heading: string; paragraphs: string[] };
  philosophy: { heading: string; items: { number: string; title: string; body: string }[] };
  maker: { heading: string; paragraphs: string[]; tags: string[] };
  cta: { text: string; link: string };
}> = {
  zh: {
    back: "← 返回首页",
    metaTitle: "关于 — ClauseCheck",
    metaDesc: "ClauseCheck 是一个独立开发者用 AI 亲手搭建的合同扫描工具。了解背后的故事和理念。",
    hero: {
      badge: "about",
      title: "一个人，一个 AI，让合同不再「看不懂」",
      subtitle: "ClauseCheck 是一个独立开发者用 AI 亲手搭建的合同扫描工具。没有团队，没有融资，只有一个人想把法律信息差打掉的执念。",
    },
    story: {
      heading: "背后的故事",
      paragraphs: [
        "签合同这件事，大多数人一生会经历几十次——租房、入职、外包、装修、代理、加盟。但每一次，对面拿出来的合同都是律师写的，几十页密密麻麻，普通人的选择只有两个：硬着头皮签，或者花几千块请律师看。",
        "几千块不是小钱。何况很多时候只是「感觉哪里不对」但又说不出来，律师看完说「没什么大问题」，几千块就没了。这笔钱如果用来吃火锅，能吃二十顿。",
        "我想做一个工具：30 秒，把合同里那些「不对劲」的地方标出来。不是为了替代律师，而是让你在决定要不要请律师之前，先有一个自己的判断。就像体检报告一样——不是医生，但让你知道哪里需要重点关注。",
      ],
    },
    philosophy: {
      heading: "理念",
      items: [
        {
          number: "01",
          title: "信息透明是权利",
          body: "合同不该只有一方能看懂。每个人都有权知道自己在签什么，AI 的使命就是把法律语言翻译成「人话」。",
        },
        {
          number: "02",
          title: "AI 是拐杖，不是大脑",
          body: "ClauseCheck 的每一条分析都会告诉你是「仅供参考，不构成法律意见」。最终决定权永远在你手里，AI 只是帮你少踩一个坑。",
        },
        {
          number: "03",
          title: "一个人也可以做出好东西",
          body: "没有团队不是借口。一个人的极致专注 + AI 的开发效率，可以在几周内做出过去需要一支团队的产品。独立开发者的时代到了。",
        },
        {
          number: "04",
          title: "数据安全不是可选项",
          body: "每条上传的合同在扫描完成后自动删除。全程传输加密，绝不用于模型训练。你的合同是你的，不是我的。",
        },
      ],
    },
    maker: {
      heading: "关于我",
      paragraphs: [
        "一个写代码的人。相信好的工具应该小而锋利，不是大而全。目前在探索 AI × 独立开发的可能性——一只脚踩在代码里，一只脚踩在现实问题里。",
      ],
      tags: ["📍 Singapore", "🛠 独立开发者", "🤖 AI 一人公司实验"],
    },
    cta: {
      text: "来试试看",
      link: "/",
    },
  },
  en: {
    back: "← Back to Home",
    metaTitle: "About — ClauseCheck",
    metaDesc: "ClauseCheck is a contract scanning tool built by a solo developer with AI. Discover the story and philosophy behind it.",
    hero: {
      badge: "about",
      title: "One Person, One AI — Making Contracts Readable",
      subtitle: "ClauseCheck is a contract scanning tool hand-built by a solo developer with AI. No team, no funding — just one person's determination to tear down the information asymmetry in legal documents.",
    },
    story: {
      heading: "The Story Behind It",
      paragraphs: [
        "Most people sign dozens of contracts in their lifetime — renting an apartment, starting a job, freelancing, renovating, acting as an agent, joining a franchise. But every time, the contract the other side hands you was written by lawyers — dozens of dense pages. The average person has only two options: sign it blindly, or spend thousands on a lawyer to review it.",
        "Thousands of dollars isn't pocket change. And often, it's just a vague feeling that 'something seems off' — the lawyer reads it, says 'nothing major,' and the money is gone. That same money could buy twenty hotpot dinners.",
        "I wanted to build a tool that flags the 'something off' parts in 30 seconds. Not to replace lawyers, but to give you your own judgment before you decide whether to hire one. Like a health checkup report — it doesn't make you a doctor, but it tells you where to pay attention.",
      ],
    },
    philosophy: {
      heading: "What I Believe",
      items: [
        {
          number: "01",
          title: "Information Transparency Is a Right",
          body: "A contract shouldn't be understood by only one side. Everyone has the right to know what they're signing. AI's mission is to translate legalese into plain language.",
        },
        {
          number: "02",
          title: "AI Is a Crutch, Not a Brain",
          body: "Every analysis from ClauseCheck comes with 'for reference only, not legal advice.' The final decision is always yours. AI just helps you avoid one more pitfall.",
        },
        {
          number: "03",
          title: "One Person Can Build Great Things",
          body: "No team is not an excuse. One person's extreme focus + AI development efficiency can produce in weeks what used to require a whole team. The era of the indie developer is here.",
        },
        {
          number: "04",
          title: "Data Security Is Not Optional",
          body: "Every uploaded contract is automatically deleted after scanning. End-to-end encryption throughout transmission. Never used for model training. Your contract is yours, not mine.",
        },
      ],
    },
    maker: {
      heading: "About Me",
      paragraphs: [
        "Someone who writes code. I believe good tools should be small and sharp, not big and bloated. Currently exploring the possibilities of AI × indie development — one foot in code, one foot in real-world problems.",
      ],
      tags: ["📍 Singapore", "🛠 Indie Developer", "🤖 AI One-Person Company Experiment"],
    },
    cta: {
      text: "Give It a Try",
      link: "/",
    },
  },
};

// ── Page component ──

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = content[locale as "en" | "zh"] ?? content.zh;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <a href={`/${locale}`} className="text-sm text-ink-muted hover:text-ink mb-8 inline-block font-sans">
          {c.back}
        </a>

        {/* Hero */}
        <div className="mb-16">
          <span className="text-xs tracking-widest uppercase text-ink-muted mb-4 block font-sans">
            {c.hero.badge}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{c.hero.title}</h1>
          <p className="text-lg text-ink-muted leading-relaxed">{c.hero.subtitle}</p>
        </div>

        {/* Story */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-6">{c.story.heading}</h2>
          <div className="space-y-4 text-ink-muted leading-relaxed">
            {c.story.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Philosophy */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-8">{c.philosophy.heading}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {c.philosophy.items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-6 hover:border-gray-200 transition-colors">
                <span className="text-3xl font-bold text-gray-200 block mb-3">{item.number}</span>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Maker */}
        <section className="mb-16 p-8 bg-gray-50 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">{c.maker.heading}</h2>
          {c.maker.paragraphs.map((p, i) => (
            <p key={i} className="text-ink-muted leading-relaxed mb-4">{p}</p>
          ))}
          <div className="flex flex-wrap gap-2 mt-4">
            {c.maker.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-white px-3 py-1.5 rounded-full border border-gray-200 font-sans">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <a
            href={`/${locale}`}
            className="inline-block bg-ink text-white px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            {c.cta.text}
          </a>
        </div>
      </div>
    </div>
  );
}
