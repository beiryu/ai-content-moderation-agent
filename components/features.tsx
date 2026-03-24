import { IndividualFeature } from "./individual-feature"

const features = [
  {
    title: "Interview Buddy",
    description:
      "Get real-time interview help and answers to interview questions.",
  },
  {
    title: "AI Interview Practice",
    description:
      "Practice with AI-generated interviews to gain valuable insights and confidence.",
  },
  {
    title: "Performance Analytics",
    description:
      "Track your progress and see how you're doing, helping you get hired faster.",
  },
  {
    title: "AI Cover Letter",
    description:
      "Generate a cover letter tailored to the job you're applying for.",
  },
  {
    title: "Industry Knowledge",
    description:
      "Expert-level industry support to ace field-specific challenges.",
  },
  {
    title: "Support 25+ languages",
    description:
      "Interviewing for language other than English, We've got you back.",
  },
]

export function Features() {
  return (
    <section className="py-24">
      <div className="container">
        <h2 className="text-5xl md:text-6xl text-center font-bold tracking-tighter">
          Everything you need
        </h2>
        <p className="max-w-xl mx-auto text-center text-white/50 mt-5"></p>
        <ul className="columns-1 md:columns-3 w-10/12 mx-auto mt-16 space-y-4">
          {features.map((feature, index) => (
            <IndividualFeature
              key={index}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}
