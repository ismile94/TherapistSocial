import { useSpring, animated, config } from '@react-spring/web'

interface AnimatedNumberProps {
  value: number
  className?: string
  duration?: number
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  className = '',
  duration = 1000
}) => {
  const props = useSpring({
    from: { number: 0 },
    to: { number: value },
    config: { duration },
    ...config.slow
  })

  return (
    <animated.span className={className}>
      {props.number.to(n => Math.floor(n))}
    </animated.span>
  )
}

export default AnimatedNumber

