# Equazioni Biquadratiche - Project TODO

## Core Adaptation
- [x] Copy ONNX models, components, hooks from math-input-panel
- [x] Install additional dependencies (ink-on, onnxruntime-web, katex)
- [ ] Create BiquadraticExercises.tsx with all 7 steps
- [ ] Update index.html title and meta
- [ ] Update index.css (keep same theme as math-input-panel)
- [ ] Update App.tsx routing
- [ ] Create embed.html for Blogger

## Input Phase
- [ ] 6 handwriting inputs: A(num/den), B(num/den), C(num/den)
- [ ] "SCRIVI IL NUMERO NEL RIQUADRO" hint
- [ ] Preview of assembled equation

## Exercise Phase (7 Steps)
- [ ] Step 1: Write the equation ±ax⁴ ± bx² ± c = 0
- [ ] Step 2: Variable substitution t = x² → at² + bt + c = 0
- [ ] Step 3: Calculate Delta Δ = b² − 4ac (with user verification)
- [ ] Step 4: Calculate t₁ = (-b + √Δ) / (2a)
- [ ] Step 5: Calculate t₂ = (-b - √Δ) / (2a)
- [ ] Step 6: Calculate x = ±√t (extract roots)
- [ ] Step 7: Verify results

## PDF Generation
- [ ] NotebookGuide with "RICOPIA SUL QUADERNO" sections
- [ ] PDF download button with print-based PDF

## Testing & Deployment
- [ ] Build and verify locally
- [ ] Deploy to preview
- [ ] Test all edge cases (negative delta, single solution, etc.)
