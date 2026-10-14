import { HeroSection } from "./_components/hero-section"
import { ResearchSection } from "./_components/research-section"
import { CalendarSection } from "./_components/calendar-section"
import { HelmetsSection } from "./_components/helmets-section"
import { PartnersSection } from "./_components/partners-section"

const HomePage = () => {
  return (
    <main className="w-full">
      <HeroSection />
      <div className="relative -mt-1 z-10">
        <ResearchSection />
        <PartnersSection />
        <CalendarSection />
        <HelmetsSection />
      </div>
    </main>
  )
}

export default HomePage
