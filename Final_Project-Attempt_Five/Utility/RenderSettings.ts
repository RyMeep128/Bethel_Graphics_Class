export class RenderSettings {
    waterColorEnabled = true;

    k_ambient  = 0.35;
    k_diffuse  = 1.00;
    k_specular = 0.30;
    p          = 20.0;

    k_delta    = 0.1;   // theirs
    k_theta    = 1.0;   // theirs
    k_omega    = 1.0;   // theirs

    k  = 0.2;
    k_r = 0.2;

    patchCuttoff = 0.7;        // theirs k_p
    alphaScalingFactor = 0.4;  // theirs c_a
}
