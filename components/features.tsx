import { IndividualFeature } from "./individual-feature"

const features = [
  {
    title: "Real-time AI Feedback",
    description:
      "Get instant feedback on your work, helping you improve and stay on top of your tasks.",
  },
  {
    title: "Personalized Coaching",
    description:
      "Get personalized coaching from our AI, helping you improve and stay on top of your tasks.",
  },
  {
    title: "Performance Analytics",
    description:
      "Track your progress and see how you're doing, helping you stay on top of your tasks.",
  },
]

export function Features() {
  return (
    <section className="py-24">
      <div className="container">
        <h2 className="text-5xl md:text-6xl text-center font-bold tracking-tighter">
          Everything you need
        </h2>
        <p className="max-w-xl mx-auto text-center text-white/50 mt-5">
          Get instant feedback, personalized coaching, and detailed analytics to
          help you stay on track and achieve your goals faster than ever before.
        </p>
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
